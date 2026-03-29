package com.meetx.controller;

import com.meetx.dto.ApiResponse;
import com.meetx.dto.ScheduleMeetingRequest;
import com.meetx.model.ScheduledMeeting;
import com.meetx.service.ScheduledMeetingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/meetings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ScheduledMeetingController {

    private final ScheduledMeetingService meetingService;

    /**
     * POST /api/meetings/schedule  [JWT required]
     * Schedule a new meeting and send invite emails to all invitees.
     */
    @PostMapping("/schedule")
    public ResponseEntity<ApiResponse<ScheduledMeeting>> schedule(
            @RequestBody ScheduleMeetingRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        ScheduledMeeting meeting = meetingService.scheduleMeeting(
                userDetails.getUsername(), request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Meeting scheduled and invites sent!", meeting));
    }

    /**
     * GET /api/meetings/my  [JWT required]
     * Returns all upcoming meetings where the user is host or invitee.
     */
    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<ScheduledMeeting>>> getMyMeetings(
            @AuthenticationPrincipal UserDetails userDetails) {

        List<ScheduledMeeting> meetings = meetingService.getMyMeetings(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Upcoming meetings", meetings));
    }

    /**
     * DELETE /api/meetings/{id}  [JWT required]
     * Cancel a meeting. Only the host can cancel. Sends cancellation emails.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> cancel(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails) {

        meetingService.cancelMeeting(id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Meeting cancelled", null));
    }
}
