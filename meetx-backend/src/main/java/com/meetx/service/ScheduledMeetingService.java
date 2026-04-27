package com.meetx.service;

import com.meetx.dto.ScheduleMeetingRequest;
import com.meetx.dto.UpdateMeetingRequest;
import com.meetx.model.Room;
import com.meetx.model.ScheduledMeeting;
import com.meetx.model.User;
import com.meetx.repository.RoomRepository;
import com.meetx.repository.ScheduledMeetingRepository;
import com.meetx.repository.UserRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

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

    // ── Schedule a meeting ────────────────────────────────────────────────────

    public ScheduledMeeting scheduleMeeting(String hostEmail, ScheduleMeetingRequest req) {
        User host = userRepository.findByEmail(hostEmail)
                .orElseThrow(() -> new RuntimeException("User not found: " + hostEmail));

        String roomCode = generateUniqueRoomCode();

        Room room = Room.builder()
                .roomCode(roomCode)
                .createdBy(host.getId())
                .createdAt(LocalDateTime.now())
                .active(false)
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
        sendInviteEmails(meeting, host.getName());

        log.info("Meeting scheduled: '{}' by {} for {}", req.getTitle(), hostEmail, req.getScheduledAt());
        return meeting;
    }

    // ── Get meetings for a user ───────────────────────────────────────────────

    public List<ScheduledMeeting> getMyMeetings(String email) {
        List<ScheduledMeeting> hosted  = meetingRepository.findByHostEmailOrderByScheduledAtAsc(email);
        List<ScheduledMeeting> invited = meetingRepository.findByInviteesContainingOrderByScheduledAtAsc(email);

        List<ScheduledMeeting> all = new ArrayList<>(hosted);
        invited.stream()
                .filter(m -> hosted.stream().noneMatch(h -> h.getId().equals(m.getId())))
                .forEach(all::add);

        return all.stream()
                .filter(m -> !"ENDED".equals(m.getStatus()) && !"CANCELLED".equals(m.getStatus()))
                .filter(m -> m.getHostEmail().equals(email) ||
                             (m.getInvitees() != null && m.getInvitees().contains(email)))
                .sorted((a, b) -> a.getScheduledAt().compareTo(b.getScheduledAt()))
                .toList();
    }

    // ── Scheduler ─────────────────────────────────────────────────────────────

    @Scheduled(fixedDelay = 60 * 1000)
    public void processMeetingSchedule() {
        LocalDateTime now = LocalDateTime.now();

        List<ScheduledMeeting> starting = meetingRepository
                .findByStatusAndScheduledAtBefore("UPCOMING", now.plusMinutes(1));

        starting.forEach(meeting -> {
            roomRepository.findByRoomCode(meeting.getRoomCode()).ifPresent(room -> {
                room.setActive(true);
                room.setLastEmptyAt(LocalDateTime.now());
                roomRepository.save(room);
            });
            meeting.setStatus("ACTIVE");
            meetingRepository.save(meeting);
            log.info("Meeting activated: {}", meeting.getTitle());
        });

        List<ScheduledMeeting> active = meetingRepository
                .findByStatusAndScheduledAtBefore("ACTIVE", now.minusMinutes(1));

        active.forEach(meeting -> {
            LocalDateTime endTime = meeting.getScheduledAt().plusMinutes(meeting.getDurationMinutes());
            if (now.isAfter(endTime)) {
                meeting.setStatus("ENDED");
                meetingRepository.save(meeting);
                log.info("Meeting ended: {}", meeting.getTitle());
            }
        });
    }

    // ── Cancel ────────────────────────────────────────────────────────────────

    public void cancelMeeting(String meetingId, String requestingEmail) {
        ScheduledMeeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        if (!meeting.getHostEmail().equals(requestingEmail)) {
            throw new RuntimeException("Only the host can cancel this meeting");
        }

        meeting.setStatus("CANCELLED");
        meetingRepository.save(meeting);

        roomRepository.findByRoomCode(meeting.getRoomCode()).ifPresent(room -> {
            room.setActive(false);
            roomRepository.save(room);
        });

        sendCancellationEmails(meeting);
        log.info("Meeting cancelled: {}", meeting.getTitle());
    }

    // ── Update meeting ────────────────────────────────────────────────────────

    public ScheduledMeeting updateMeeting(String meetingId, String requestingEmail,
                                           UpdateMeetingRequest req) {
        ScheduledMeeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        if (!meeting.getHostEmail().equals(requestingEmail)) {
            throw new RuntimeException("Only the host can edit this meeting");
        }

        if ("ENDED".equals(meeting.getStatus()) || "CANCELLED".equals(meeting.getStatus())) {
            throw new RuntimeException("Cannot edit a meeting that has ended or been cancelled");
        }

        if (req.getTitle() != null && !req.getTitle().isBlank())
            meeting.setTitle(req.getTitle());

        if (req.getDescription() != null)
            meeting.setDescription(req.getDescription());

        if (req.getScheduledAt() != null)
            meeting.setScheduledAt(req.getScheduledAt());

        if (req.getDurationMinutes() > 0)
            meeting.setDurationMinutes(req.getDurationMinutes());

        // Replace full invitees list if provided (handles removals)
        if (req.getInvitees() != null) {
            meeting.setInvitees(req.getInvitees());
        }

        // Send emails to newly added people only
        if (req.getNewInvitees() != null && !req.getNewInvitees().isEmpty()) {
            List<String> current = meeting.getInvitees() != null
                    ? meeting.getInvitees() : new ArrayList<>();

            List<String> toAdd = req.getNewInvitees().stream()
                    .filter(e -> e.contains("@") && !current.contains(e))
                    .toList();

            if (!toAdd.isEmpty()) {
                // merge into current list if invitees wasn't fully replaced
                if (req.getInvitees() == null) {
                    List<String> merged = new ArrayList<>(current);
                    merged.addAll(toAdd);
                    meeting.setInvitees(merged);
                }

                User host = userRepository.findByEmail(requestingEmail)
                        .orElseThrow(() -> new RuntimeException("Host not found"));

                ScheduledMeeting finalMeeting = meeting;
                toAdd.forEach(email -> {
                    try {
                        String joinUrl = "https://meetx.saimjs.com/room/" + finalMeeting.getRoomCode();
                        String fmtTime    = finalMeeting.getScheduledAt().format(DISPLAY_FMT);
                        sendHtmlEmail(email,
                                "📅 You're invited: " + finalMeeting.getTitle(),
                                buildInviteHtml(finalMeeting, host.getName(), fmtTime, joinUrl));
                    } catch (Exception e) {
                        log.error("Failed to send invite to {}: {}", email, e.getMessage());
                    }
                });
            }
        }

        meeting = meetingRepository.save(meeting);
        log.info("Meeting updated: {}", meeting.getTitle());
        return meeting;
    }

    // ── Start now ─────────────────────────────────────────────────────────────

    public ScheduledMeeting startNow(String meetingId, String requestingEmail) {
        ScheduledMeeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        if (!meeting.getHostEmail().equals(requestingEmail)) {
            throw new RuntimeException("Only the host can start this meeting");
        }

        roomRepository.findByRoomCode(meeting.getRoomCode()).ifPresent(room -> {
            room.setActive(true);
            room.setLastEmptyAt(LocalDateTime.now());
            roomRepository.save(room);
        });

        meeting.setStatus("ACTIVE");
        meeting.setScheduledAt(LocalDateTime.now());
        meetingRepository.save(meeting);

        log.info("Meeting started now: {}", meeting.getTitle());
        return meeting;
    }

    // ── Email helpers ─────────────────────────────────────────────────────────

    private void sendInviteEmails(ScheduledMeeting meeting, String hostName) {
        if (meeting.getInvitees() == null || meeting.getInvitees().isEmpty()) return;

        String subject      = "📅 You're invited: " + meeting.getTitle();
        String formattedTime = meeting.getScheduledAt().format(DISPLAY_FMT);
        String joinUrl      = "https://meetx.saimjs.com/room/" + meeting.getRoomCode();
        String html         = buildInviteHtml(meeting, hostName, formattedTime, joinUrl);

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

        String subject      = "❌ Meeting cancelled: " + meeting.getTitle();
        String formattedTime = meeting.getScheduledAt().format(DISPLAY_FMT);

        String html = """
                <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px;">
                  <h2 style="color:#111827;">Meeting Cancelled</h2>
                  <p style="color:#6b7280;">This meeting has been cancelled by the host.</p>
                  <div style="background:white;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #ef4444;">
                    <h3 style="margin:0 0 8px;color:#111827;">%s</h3>
                    <p style="margin:0;color:#6b7280;">Was scheduled for: %s</p>
                  </div>
                  <p style="color:#6b7280;font-size:14px;">— MeetX</p>
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
        helper.setFrom("MeetX <noreply@saimjs.com>");
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlBody, true);
        mailSender.send(message);
    }

    private String buildInviteHtml(ScheduledMeeting meeting, String hostName,
                                    String formattedTime, String joinUrl) {
        String description = (meeting.getDescription() != null && !meeting.getDescription().isBlank())
                ? "<p style=\"color:#6b7280;margin:8px 0 0;\">" + meeting.getDescription() + "</p>"
                : "";

        return """
                <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden;">
                  <div style="background:#06070d;padding:28px 32px;">
                    <h1 style="color:#00d4aa;margin:0;font-size:22px;">MeetX</h1>
                    <p style="color:#8b91b0;margin:4px 0 0;font-size:13px;">Video Calls Reimagined</p>
                  </div>
                  <div style="padding:32px;">
                    <h2 style="color:#111827;margin:0 0 8px;">You're invited to a meeting!</h2>
                    <p style="color:#6b7280;margin:0 0 24px;"><strong>%s</strong> has invited you to join a MeetX video call.</p>
                    <div style="background:white;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin-bottom:24px;">
                      <h3 style="margin:0 0 6px;color:#111827;font-size:18px;">%s</h3>
                      %s
                      <hr style="border:none;border-top:1px solid #f3f4f6;margin:16px 0;"/>
                      <table style="width:100%%;border-collapse:collapse;">
                        <tr>
                          <td style="color:#9ca3af;font-size:13px;padding:4px 0;width:90px;">📅 Date</td>
                          <td style="color:#111827;font-size:13px;font-weight:500;">%s</td>
                        </tr>
                        <tr>
                          <td style="color:#9ca3af;font-size:13px;padding:4px 0;">⏱ Duration</td>
                          <td style="color:#111827;font-size:13px;font-weight:500;">%d minutes</td>
                        </tr>
                        <tr>
                          <td style="color:#9ca3af;font-size:13px;padding:4px 0;">🔑 Room code</td>
                          <td style="color:#00d4aa;font-size:13px;font-weight:700;letter-spacing:2px;font-family:monospace;">%s</td>
                        </tr>
                      </table>
                    </div>
                    <a href="%s" style="display:inline-block;background:#00d4aa;color:#06070d;padding:14px 28px;border-radius:100px;text-decoration:none;font-weight:700;font-size:15px;">
                      Join Meeting →
                    </a>
                    <p style="color:#9ca3af;font-size:12px;margin-top:24px;">
                      Or paste this link: <span style="color:#6b7280;">%s</span>
                    </p>
                  </div>
                  <div style="background:#f3f4f6;padding:16px 32px;">
                    <p style="color:#9ca3af;font-size:12px;margin:0;">Sent via MeetX · If you weren't expecting this, you can ignore it.</p>
                  </div>
                </div>
                """.formatted(hostName, meeting.getTitle(), description, formattedTime,
                        meeting.getDurationMinutes(), meeting.getRoomCode(), joinUrl, joinUrl);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private String generateUniqueRoomCode() {
        String code;
        do {
            String hex = UUID.randomUUID().toString().replace("-", "").toUpperCase().substring(0, 8);
            code = hex.substring(0, 4) + "-" + hex.substring(4, 8);
        } while (roomRepository.existsByRoomCode(code));
        return code;
    }
}