package com.meetx.service;

import com.meetx.dto.CreateRoomResponse;
import com.meetx.model.Room;
import com.meetx.model.User;
import com.meetx.repository.RoomRepository;
import com.meetx.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;
    private final UserRepository userRepository;

    /**
     * Creates a new room, generating a random, unique, collision-safe room code.
     * Room code format: "XXXX-XXXX" (4 hex chars, dash, 4 hex chars) — e.g. "A3F9-BC12".
     *
     * @param email the authenticated user's email (from JWT subject)
     * @return CreateRoomResponse with the persisted room id and code
     */
    public CreateRoomResponse createRoom(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));

        String roomCode = generateUniqueRoomCode();

        Room room = Room.builder()
                .roomCode(roomCode)
                .createdBy(user.getId())
                .createdAt(LocalDateTime.now())
                .active(true)
                .build();

        room = roomRepository.save(room);
        log.debug("Room created: {} by user: {}", roomCode, email);

        return new CreateRoomResponse(room.getId(), room.getRoomCode());
    }

    /**
     * Validates that a room exists and is still active.
     * Used both by the join endpoint and by the token endpoint to gate access.
     *
     * @param roomCode the code to look up
     * @return the Room document
     * @throws RuntimeException if the room doesn't exist or is no longer active
     */
    public Room joinRoom(String roomCode) {
        return roomRepository.findByRoomCode(roomCode.toUpperCase().trim())
                .filter(Room::isActive)
                .orElseThrow(() ->
                        new RuntimeException("Room not found or is no longer active: " + roomCode));
    }

    /**
     * Marks a room as inactive (soft-close).
     * Extend with a DELETE endpoint or a scheduled cleanup job as needed.
     *
     * @param roomCode the code of the room to close
     * @param requestingEmail the authenticated user's email — only the creator may close
     */
    public void closeRoom(String roomCode, String requestingEmail) {
        User user = userRepository.findByEmail(requestingEmail)
                .orElseThrow(() -> new RuntimeException("User not found: " + requestingEmail));

        Room room = roomRepository.findByRoomCode(roomCode)
                .orElseThrow(() -> new RuntimeException("Room not found: " + roomCode));

        if (!room.getCreatedBy().equals(user.getId())) {
            throw new RuntimeException("Only the room creator can close this room");
        }

        room.setActive(false);
        roomRepository.save(room);
        log.debug("Room closed: {} by user: {}", roomCode, requestingEmail);
    }

    // ── private helpers ──────────────────────────────────────────────────────

    /**
     * Loops until it finds a code not already present in MongoDB.
     * In practice this virtually always terminates on the first iteration.
     */
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
