package com.meetx.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LiveKitTokenResponse {
    private String token;
    private String roomCode;
    private String participantName;
}
