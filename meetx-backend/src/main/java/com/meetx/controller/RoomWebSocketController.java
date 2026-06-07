package com.meetx.controller;

import com.meetx.dto.AdmitRequest;
import com.meetx.dto.KnockRequest;
import com.meetx.dto.KickRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
@RequiredArgsConstructor
public class RoomWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/room/{code}/knock")
    public void handleKnock(
            @DestinationVariable String code,
            @Payload KnockRequest req) {
        messagingTemplate.convertAndSend(
                "/topic/room/" + code + "/knocks", req);
    }

    @MessageMapping("/room/{code}/admit")
    public void handleAdmit(
            @DestinationVariable String code,
            @Payload AdmitRequest req) {
        messagingTemplate.convertAndSend(
                "/topic/room/" + code + "/admissions",
                Map.of("email", req.getEmail(), "admitted", req.isAdmitted()));
    }

    @MessageMapping("/room/{code}/kick")
    public void handleKick(
            @DestinationVariable String code,
            @Payload KickRequest req) {
        messagingTemplate.convertAndSend(
                "/topic/room/" + code + "/kicks",
                Map.of("email", req.getEmail()));
    }
}