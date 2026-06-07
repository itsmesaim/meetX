package com.meetx.model;

import java.time.LocalDateTime;
import java.util.Set;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "rooms")
public class Room {

  @Id
  private String id;

  @Indexed(unique = true)
  private String roomCode;

  private String createdBy; // User.id of creator

  private LocalDateTime createdAt;

  private boolean active;

  // ── Session tracking ──────────────────────────────────────
  // How many participants are currently in the room.
  // Incremented on join, decremented on leave.
  @Builder.Default
  private int participantCount = 0;

  // Set when participantCount drops to 0.
  // Scheduler closes the room 30 mins after this timestamp.
  private LocalDateTime lastEmptyAt;

  @Builder.Default
  private Set<String> admittedEmails = new java.util.HashSet<>();

  @Builder.Default
  private Set<String> deniedEmails = new java.util.HashSet<>();
}
