package com.meetx.service;

import com.meetx.dto.ScheduleMeetingRequest;
import com.meetx.model.Room;
import com.meetx.model.ScheduledMeeting;
import com.meetx.model.User;
import com.meetx.repository.RoomRepository;
import com.meetx.repository.ScheduledMeetingRepository;
import com.meetx.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScheduledMeetingService {

    private final ScheduledMeetingRepository meetingRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final JavaMailSender mailSender;

    private static final DateTimeFormatter DISPLAY_FMT =
            DateTimeFormatter.ofPattern("EEEE, MMMM d yyyy 'at' h:mm a");

    // ── Schedule a meeting ────────────────────────────────────

    public ScheduledMeeting scheduleMeeting(String hostEmail, ScheduleMeetingRequest req) {
        User host = userRepository.findByEmail(hostEmail)
                .orElseThrow(() -> new RuntimeException("User not found: " + hostEmail));

        // Pre-generate a room code for this meeting
        String roomCode = generateUniqueRoomCode();

        // Save a dormant Room so the code is reserved
        Room room = Room.builder()
                .roomCode(roomCode)
                .createdBy(host.getId())
                .createdAt(LocalDateTime.now())
                .active(false)   // will be activated when the meeting starts
                .participantCount(0)
                .build();
        roomRepository.save(room);

        ScheduledMeeting meeting = ScheduledMeeting.builder()
                .title(req.getTitle())
                .description(req.getDescription())
                .hostEmail(hostEmail)
                .hostName(host.getName())
                .invitees(req.getInvitees() != null ? req.getInvitees() : new ArrayList<>())
                .scheduledAt(req.getScheduledAt())
                .durationMinutes(req.getDurationMinutes() > 0 ? req.getDurationMinutes() : 60)
                .roomCode(roomCode)
                .createdAt(LocalDateTime.now())
                .status("UPCOMING")
                .build();

        meeting = meetingRepository.save(meeting);

        // Send invite emails to all invitees
        sendInviteEmails(meeting, host.getName());

        log.info("Meeting scheduled: '{}' by {} for {}", req.getTitle(), hostEmail, req.getScheduledAt());
        return meeting;
    }

    // ── Get meetings for a user ───────────────────────────────

    public List<ScheduledMeeting> getMyMeetings(String email) {
        List<ScheduledMeeting> hosted  = meetingRepository.findByHostEmailOrderByScheduledAtAsc(email);
        List<ScheduledMeeting> invited = meetingRepository.findByInviteesContainingOrderByScheduledAtAsc(email);

        // Merge without duplicates
        List<ScheduledMeeting> all = new ArrayList<>(hosted);
        invited.stream()
                .filter(m -> hosted.stream().noneMatch(h -> h.getId().equals(m.getId())))
                .forEach(all::add);

        // Only return upcoming and active ones
        return all.stream()
                .filter(m -> !"ENDED".equals(m.getStatus()) && !"CANCELLED".equals(m.getStatus()))
                .sorted((a, b) -> a.getScheduledAt().compareTo(b.getScheduledAt()))
                .toList();
    }

    // ── Scheduler: activate rooms at meeting time ─────────────

    /**
     * Runs every minute.
     * Activates rooms for meetings that are starting now (within a 2-min window).
     * Also marks past meetings as ENDED.
     */
    @Scheduled(fixedDelay = 60 * 1000)
    public void processMeetingSchedule() {
        LocalDateTime now = LocalDateTime.now();

        // Activate upcoming meetings that are starting now
        List<ScheduledMeeting> starting = meetingRepository
                .findByStatusAndScheduledAtBefore("UPCOMING", now.plusMinutes(1));

        starting.forEach(meeting -> {
            // Activate the pre-reserved room
            roomRepository.findByRoomCode(meeting.getRoomCode()).ifPresent(room -> {
                room.setActive(true);
                room.setLastEmptyAt(LocalDateTime.now());
                roomRepository.save(room);
            });

            meeting.setStatus("ACTIVE");
            meetingRepository.save(meeting);
            log.info("Meeting activated: {}", meeting.getTitle());
        });

        // Mark active meetings as ENDED after their duration
        List<ScheduledMeeting> active = meetingRepository
                .findByStatusAndScheduledAtBefore("ACTIVE",
                        now.minusMinutes(1)); // already started

        active.forEach(meeting -> {
            LocalDateTime endTime = meeting.getScheduledAt()
                    .plusMinutes(meeting.getDurationMinutes());

            if (now.isAfter(endTime)) {
                meeting.setStatus("ENDED");
                meetingRepository.save(meeting);
                log.info("Meeting ended: {}", meeting.getTitle());
            }
        });
    }

    // ── Cancel a meeting ──────────────────────────────────────

    public void cancelMeeting(String meetingId, String requestingEmail) {
        ScheduledMeeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        if (!meeting.getHostEmail().equals(requestingEmail)) {
            throw new RuntimeException("Only the host can cancel this meeting");
        }

        meeting.setStatus("CANCELLED");
        meetingRepository.save(meeting);

        // Deactivate the room too
        roomRepository.findByRoomCode(meeting.getRoomCode()).ifPresent(room -> {
            room.setActive(false);
            roomRepository.save(room);
        });

        sendCancellationEmails(meeting);
        log.info("Meeting cancelled: {}", meeting.getTitle());
    }

    // ── Email helpers ─────────────────────────────────────────

    private void sendInviteEmails(ScheduledMeeting meeting, String hostName) {
        if (meeting.getInvitees() == null || meeting.getInvitees().isEmpty()) return;

        String subject = "📅 You're invited: " + meeting.getTitle();
        String formattedTime = meeting.getScheduledAt().format(DISPLAY_FMT);
        String joinUrl = "http://localhost:3000/room/" + meeting.getRoomCode();

        String html = buildInviteHtml(meeting, hostName, formattedTime, joinUrl);

        for (String invitee : meeting.getInvitees()) {
            try {
                sendHtmlEmail(invitee, subject, html);
                log.debug("Invite sent to {}", invitee);
            } catch (Exception e) {
                log.error("Failed to send invite to {}: {}", invitee, e.getMessage());
            }
        }
    }

    private void sendCancellationEmails(ScheduledMeeting meeting) {
        if (meeting.getInvitees() == null || meeting.getInvitees().isEmpty()) return;

        String subject = "❌ Meeting cancelled: " + meeting.getTitle();
        String formattedTime = meeting.getScheduledAt().format(DISPLAY_FMT);

        String html = """
            <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
              <h2 style="color: #111827; margin-bottom: 8px;">Meeting Cancelled</h2>
              <p style="color: #6b7280;">The following meeting has been cancelled by the host.</p>
              <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444;">
                <h3 style="margin: 0 0 8px; color: #111827;">%s</h3>
                <p style="margin: 0; color: #6b7280;">Was scheduled for: %s</p>
              </div>
              <p style="color: #6b7280; font-size: 14px;">— MeetX</p>
            </div>
            """.formatted(meeting.getTitle(), formattedTime);

        for (String invitee : meeting.getInvitees()) {
            try {
                sendHtmlEmail(invitee, subject, html);
            } catch (Exception e) {
                log.error("Failed to send cancellation to {}: {}", invitee, e.getMessage());
            }
        }
    }

    private void sendHtmlEmail(String to, String subject, String htmlBody)
            throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlBody, true);   // true = html
        mailSender.send(message);
    }

    private String buildInviteHtml(ScheduledMeeting meeting, String hostName,
                                    String formattedTime, String joinUrl) {
        String description = (meeting.getDescription() != null && !meeting.getDescription().isBlank())
                ? "<p style=\"color:#6b7280; margin: 8px 0 0;\">" + meeting.getDescription() + "</p>"
                : "";

        return """
            <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; background: #f9fafb; border-radius: 12px; overflow: hidden;">
              <!-- Header -->
              <div style="background: #06070d; padding: 28px 32px;">
                <h1 style="color: #00d4aa; margin: 0; font-size: 22px; letter-spacing: -0.5px;">MeetX</h1>
                <p style="color: #8b91b0; margin: 4px 0 0; font-size: 13px;">Video Calls Reimagined</p>
              </div>

              <!-- Body -->
              <div style="padding: 32px;">
                <h2 style="color: #111827; margin: 0 0 8px;">You're invited to a meeting!</h2>
                <p style="color: #6b7280; margin: 0 0 24px;">
                  <strong>%s</strong> has invited you to join a MeetX video call.
                </p>

                <!-- Meeting card -->
                <div style="background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
                  <h3 style="margin: 0 0 6px; color: #111827; font-size: 18px;">%s</h3>
                  %s
                  <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 16px 0;" />
                  <table style="width: 100%%; border-collapse: collapse;">
                    <tr>
                      <td style="color: #9ca3af; font-size: 13px; padding: 4px 0; width: 90px;">📅 Date</td>
                      <td style="color: #111827; font-size: 13px; font-weight: 500;">%s</td>
                    </tr>
                    <tr>
                      <td style="color: #9ca3af; font-size: 13px; padding: 4px 0;">⏱ Duration</td>
                      <td style="color: #111827; font-size: 13px; font-weight: 500;">%d minutes</td>
                    </tr>
                    <tr>
                      <td style="color: #9ca3af; font-size: 13px; padding: 4px 0;">🔑 Room code</td>
                      <td style="color: #00d4aa; font-size: 13px; font-weight: 700; letter-spacing: 2px; font-family: monospace;">%s</td>
                    </tr>
                  </table>
                </div>

                <!-- CTA Button -->
                <a href="%s"
                   style="display: inline-block; background: #00d4aa; color: #06070d;
                          padding: 14px 28px; border-radius: 100px; text-decoration: none;
                          font-weight: 700; font-size: 15px; letter-spacing: 0.3px;">
                  Join Meeting →
                </a>

                <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
                  Or paste this link in your browser:<br/>
                  <span style="color: #6b7280;">%s</span>
                </p>
              </div>

              <!-- Footer -->
              <div style="background: #f3f4f6; padding: 16px 32px;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  Sent via MeetX · If you weren't expecting this, you can ignore it.
                </p>
              </div>
            </div>
            """.formatted(
                hostName,
                meeting.getTitle(),
                description,
                formattedTime,
                meeting.getDurationMinutes(),
                meeting.getRoomCode(),
                joinUrl,
                joinUrl
        );
    }

    // ── Private helpers ───────────────────────────────────────

    private String generateUniqueRoomCode() {
        String code;
        do {
            String hex = UUID.randomUUID()
                    .toString()
                    .replace("-", "")
                    .toUpperCase()
                    .substring(0, 8);
            code = hex.substring(0, 4) + "-" + hex.substring(4, 8);
        } while (roomRepository.existsByRoomCode(code));
        return code;
    }
}
