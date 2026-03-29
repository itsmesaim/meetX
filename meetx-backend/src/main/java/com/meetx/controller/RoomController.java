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

    /**
     * POST /api/rooms/create   [Authorization: Bearer <JWT> required]
     *
     * Creates a new room. The authenticated user becomes the room owner.
     *
     * Response (201 Created):
     * {
     *   "success": true,
     *   "message": "Room created successfully",
     *   "data": {
     *     "roomId":   "64abc...",
     *     "roomCode": "A3F9-BC12"
     *   }
     * }
     */
    @PostMapping("/create")
    public ResponseEntity<ApiResponse<CreateRoomResponse>> createRoom(
            @AuthenticationPrincipal UserDetails userDetails) {

        CreateRoomResponse response = roomService.createRoom(userDetails.getUsername());
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Room created successfully", response));
    }

    /**
     * POST /api/rooms/join   [No auth required — shareable link entry point]
     *
     * Validates the room code and returns the Room document.
     * Intended as a lightweight "does this room exist?" check before connecting to LiveKit.
     *
     * Request body:
     * { "roomCode": "A3F9-BC12" }
     *
     * Response (200 OK):
     * {
     *   "success": true,
     *   "message": "Joined room successfully",
     *   "data": { ...Room fields... }
     * }
     */
    @PostMapping("/join")
    public ResponseEntity<ApiResponse<Room>> joinRoom(
            @RequestBody JoinRoomRequest request) {

        Room room = roomService.joinRoom(request.getRoomCode());
        return ResponseEntity.ok(ApiResponse.success("Joined room successfully", room));
    }

    /**
     * GET /api/rooms/{code}/token?participantName=Alice   [Authorization: Bearer <JWT> required]
     *
     * Verifies the room is active, then mints a signed LiveKit access token.
     * The participantName param is optional; defaults to the authenticated user's email.
     *
     * Response (200 OK):
     * {
     *   "success": true,
     *   "message": "Token generated",
     *   "data": {
     *     "token":           "<LiveKit JWT>",
     *     "roomCode":        "A3F9-BC12",
     *     "participantName": "Alice"
     *   }
     * }
     */
    @GetMapping("/{code}/token")
    public ResponseEntity<ApiResponse<LiveKitTokenResponse>> getLiveKitToken(
            @PathVariable String code,
            @RequestParam(required = false) String participantName,
            @AuthenticationPrincipal UserDetails userDetails) {

        // Validate the room before issuing any token
        roomService.joinRoom(code);

        // Fall back to email if caller didn't supply a display name
        String identity = (participantName != null && !participantName.isBlank())
                ? participantName
                : userDetails.getUsername();

        LiveKitTokenResponse tokenResponse = liveKitService.generateToken(code, identity);
        return ResponseEntity.ok(ApiResponse.success("Token generated", tokenResponse));
    }

    /**
     * DELETE /api/rooms/{code}   [Authorization: Bearer <JWT> required]
     *
     * Soft-closes a room (sets active=false). Only the room creator may do this.
     *
     * Response (200 OK):
     * { "success": true, "message": "Room closed", "data": null }
     */
    @DeleteMapping("/{code}")
    public ResponseEntity<ApiResponse<Void>> closeRoom(
            @PathVariable String code,
            @AuthenticationPrincipal UserDetails userDetails) {

        roomService.closeRoom(code, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Room closed", null));
    }
}
