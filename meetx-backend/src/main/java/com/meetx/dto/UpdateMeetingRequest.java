package com.meetx.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class UpdateMeetingRequest {
    private String title;
    private String description;
    private LocalDateTime scheduledAt;
    private int durationMinutes;
    private List<String> newInvitees;
}
