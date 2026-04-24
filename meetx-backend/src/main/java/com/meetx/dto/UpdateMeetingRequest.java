package com.meetx.dto;

import java.time.LocalDateTime;
import java.util.List;
import lombok.Data;

@Data
public class UpdateMeetingRequest {
  private String title;
  private String description;
  private LocalDateTime scheduledAt;
  private int durationMinutes;
  private List<String> newInvitees;
  private List<String> invitees;
}
