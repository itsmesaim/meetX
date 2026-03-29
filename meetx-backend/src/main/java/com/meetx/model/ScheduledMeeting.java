package com.meetx.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "scheduled_meetings")
public class ScheduledMeeting {

    @Id
    private String id;

    private String title;

    private String description;

    @Indexed
    private String hostEmail;       // email of the person who scheduled it

    private String hostName;

    private List<String> invitees;  // list of email addresses to invite

    private LocalDateTime scheduledAt;  // when the meeting starts

    private int durationMinutes;    // expected duration

    private String roomCode;        // pre-generated room code

    private LocalDateTime createdAt;

    // UPCOMING | ACTIVE | ENDED | CANCELLED
    @Builder.Default
    private String status = "UPCOMING";
}
