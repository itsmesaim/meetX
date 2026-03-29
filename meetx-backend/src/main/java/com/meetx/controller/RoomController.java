package com.meetx.controller;

import com.meetx.dto.ApiResponse;
import com.meetx.dto.CreateRoomResponse;
import com.meetx.dto.JoinRoomRequest;
import com.meetx.dto.LiveKitTokenResponse;
import com.meetx.model.Room;
import com.meetx.service.LiveKitService;
import com.meetx.service.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RoomController {

    private final RoomService roomService;
    private final LiveKitService liveKitService;

    /** POST /api/rooms/create — create a new room */
    @PostMapping("/create")
    public ResponseEntity<ApiResponse<CreateRoomResponse>> createRoom(
            @AuthenticationPrincipal UserDetails userDetails) {

        CreateRoomResponse response = roomService.createRoom(userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Room created successfully", response));
    }

    /** POST /api/rooms/join — validate a room code */
    @PostMapping("/join")
    public ResponseEntity<ApiResponse<Room>> joinRoom(
            @RequestBody JoinRoomRequest request) {

        Room room = roomService.joinRoom(request.getRoomCode());
        return ResponseEntity.ok(ApiResponse.success("Room is active", room));
    }

    /** GET /api/rooms/{code}/token — get LiveKit token */
    @GetMapping("/{code}/token")
    public ResponseEntity<ApiResponse<LiveKitTokenResponse>> getLiveKitToken(
            @PathVariable String code,
            @RequestParam(required = false) String participantName,
            @AuthenticationPrincipal UserDetails userDetails) {

        roomService.joinRoom(code);

        String identity = (participantName != null && !participantName.isBlank())
                ? participantName
                : userDetails.getUsername();

        LiveKitTokenResponse tokenResponse = liveKitService.generateToken(code, identity);
        return ResponseEntity.ok(ApiResponse.success("Token generated", tokenResponse));
    }

    /**
     * POST /api/rooms/{code}/session/join
     * Called by the frontend when a participant successfully connects to LiveKit.
     * Increments the participant counter and clears the empty-room timer.
     */
    @PostMapping("/{code}/session/join")
    public ResponseEntity<ApiResponse<Void>> participantJoined(@PathVariable String code) {
        roomService.onParticipantJoin(code);
        return ResponseEntity.ok(ApiResponse.success("Session updated", null));
    }

    /**
     * POST /api/rooms/{code}/session/leave
     * Called by the frontend when a participant disconnects from LiveKit.
     * Decrements the counter. If it hits 0, starts the 30-min auto-close countdown.
     */
    @PostMapping("/{code}/session/leave")
    public ResponseEntity<ApiResponse<Void>> participantLeft(@PathVariable String code) {
        roomService.onParticipantLeave(code);
        return ResponseEntity.ok(ApiResponse.success("Session updated", null));
    }

    /** DELETE /api/rooms/{code} — creator manually closes the room */
    @DeleteMapping("/{code}")
    public ResponseEntity<ApiResponse<Void>> closeRoom(
            @PathVariable String code,
            @AuthenticationPrincipal UserDetails userDetails) {

        roomService.closeRoom(code, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Room closed", null));
    }
}
