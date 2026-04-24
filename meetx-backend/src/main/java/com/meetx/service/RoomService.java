package com.meetx.service;

import com.meetx.dto.CreateRoomResponse;
import com.meetx.model.Room;
import com.meetx.model.User;
import com.meetx.repository.RoomRepository;
import com.meetx.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoomService {

  private final RoomRepository roomRepository;
  private final UserRepository userRepository;

  // How long an empty room stays active before being auto-closed
  private static final int EMPTY_ROOM_TTL_MINUTES = 30;

  // ── Create ────────────────────────────────────────────────

  public CreateRoomResponse createRoom(String email) {
    User user =
        userRepository
            .findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found: " + email));

    String roomCode = generateUniqueRoomCode();

    Room room =
        Room.builder()
            .roomCode(roomCode)
            .createdBy(user.getId())
            .createdAt(LocalDateTime.now())
            .active(true)
            .participantCount(0)
            .lastEmptyAt(LocalDateTime.now()) // starts "empty" from creation
            .build();

    room = roomRepository.save(room);
    log.debug("Room created: {} by {}", roomCode, email);

    return new CreateRoomResponse(room.getId(), room.getRoomCode());
  }

  // ── Join / Leave ──────────────────────────────────────────

  public Room joinRoom(String roomCode) {
    return roomRepository
        .findByRoomCode(roomCode.toUpperCase().trim())
        .filter(Room::isActive)
        .orElseThrow(
            () -> new RuntimeException("Room not found or is no longer active: " + roomCode));
  }

  /**
   * Called when a participant joins the LiveKit room. Increments participantCount and clears the
   * lastEmptyAt timer.
   */
  public void onParticipantJoin(String roomCode) {
    roomRepository
        .findByRoomCode(roomCode.toUpperCase().trim())
        .ifPresent(
            room -> {
              room.setParticipantCount(room.getParticipantCount() + 1);
              room.setLastEmptyAt(null); // room is no longer empty
              roomRepository.save(room);
              log.debug(
                  "Participant joined room={} count={}", roomCode, room.getParticipantCount());
            });
  }

  /**
   * Called when a participant leaves the LiveKit room. Decrements participantCount. If it hits 0,
   * starts the 30-min countdown.
   */
  public void onParticipantLeave(String roomCode) {
    roomRepository
        .findByRoomCode(roomCode.toUpperCase().trim())
        .ifPresent(
            room -> {
              int count = Math.max(0, room.getParticipantCount() - 1);
              room.setParticipantCount(count);

              if (count == 0) {
                room.setLastEmptyAt(LocalDateTime.now());
                log.debug("Room {} is now empty — 30min countdown started", roomCode);
              }

              roomRepository.save(room);
            });
  }

  // ── Soft-close (manual by creator) ───────────────────────

  public void closeRoom(String roomCode, String requestingEmail) {
    User user =
        userRepository
            .findByEmail(requestingEmail)
            .orElseThrow(() -> new RuntimeException("User not found: " + requestingEmail));

    Room room =
        roomRepository
            .findByRoomCode(roomCode)
            .orElseThrow(() -> new RuntimeException("Room not found: " + roomCode));

    if (!room.getCreatedBy().equals(user.getId())) {
      throw new RuntimeException("Only the room creator can close this room");
    }

    room.setActive(false);
    roomRepository.save(room);
    log.debug("Room {} manually closed by {}", roomCode, requestingEmail);
  }

  // ── Scheduler: auto-close empty rooms after 30 mins ──────

  /**
   * Runs every 5 minutes. Finds all active rooms that have been empty for 30+ minutes and closes
   * them.
   */
  @Scheduled(fixedDelay = 5 * 60 * 1000) // every 5 minutes
  public void closeAbandonedRooms() {
    LocalDateTime threshold = LocalDateTime.now().minusMinutes(EMPTY_ROOM_TTL_MINUTES);
    List<Room> abandoned = roomRepository.findAbandonedRooms(threshold);

    if (!abandoned.isEmpty()) {
      log.info("Auto-closing {} abandoned room(s)", abandoned.size());
      abandoned.forEach(
          room -> {
            room.setActive(false);
            roomRepository.save(room);
            log.debug("Auto-closed room: {}", room.getRoomCode());
          });
    }
  }

  // ── Helpers ───────────────────────────────────────────────

  private String generateUniqueRoomCode() {
    String code;
    do {
      String hex = UUID.randomUUID().toString().replace("-", "").toUpperCase().substring(0, 8);
      code = hex.substring(0, 4) + "-" + hex.substring(4, 8);
    } while (roomRepository.existsByRoomCode(code));
    return code;
  }
}
