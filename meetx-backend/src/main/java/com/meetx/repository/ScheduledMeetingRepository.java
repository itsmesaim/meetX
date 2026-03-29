package com.meetx.repository;

import com.meetx.model.ScheduledMeeting;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ScheduledMeetingRepository extends MongoRepository<ScheduledMeeting, String> {

    // All meetings hosted by this user, ordered soonest first
    List<ScheduledMeeting> findByHostEmailOrderByScheduledAtAsc(String hostEmail);

    // Upcoming meetings where this email is an invitee
    List<ScheduledMeeting> findByInviteesContainingOrderByScheduledAtAsc(String email);

    // All upcoming meetings after a given time (for scheduler)
    List<ScheduledMeeting> findByStatusAndScheduledAtBefore(String status, LocalDateTime time);
}
