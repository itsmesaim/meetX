package com.meetx;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling   // ← needed for @Scheduled in RoomService + ScheduledMeetingService
public class MeetXApplication {
    public static void main(String[] args) {
        SpringApplication.run(MeetXApplication.class, args);
    }
}
