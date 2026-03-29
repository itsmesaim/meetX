package com.meetx.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class ScheduleMeetingRequest {
    private String title;
    private String description;
    private LocalDateTime scheduledAt;
    private int durationMinutes;
    private List<String> invitees;   // list of email addresses
}
