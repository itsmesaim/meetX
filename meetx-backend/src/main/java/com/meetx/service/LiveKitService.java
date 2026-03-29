package com.meetx.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.meetx.dto.LiveKitTokenResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Service
public class LiveKitService {

    @Value("${livekit.api-key}")
    private String apiKey;

    @Value("${livekit.api-secret}")
    private String apiSecret;

    @Value("${livekit.token-ttl-seconds:86400}")
    private long tokenTtlSeconds;

    private final ObjectMapper mapper = new ObjectMapper();

    public LiveKitTokenResponse generateToken(String roomCode, String participantName) {
        try {
            long nowSec = System.currentTimeMillis() / 1000;
            long expSec = nowSec + tokenTtlSeconds;

            // 1. Header
            Map<String, String> header = new LinkedHashMap<>();
            header.put("alg", "HS256");
            header.put("typ", "JWT");

            // 2. Video grant
            Map<String, Object> videoGrant = new LinkedHashMap<>();
            videoGrant.put("roomJoin",       true);
            videoGrant.put("room",           roomCode);
            videoGrant.put("canPublish",     true);
            videoGrant.put("canSubscribe",   true);
            videoGrant.put("canPublishData", true);

            // 3. Payload — exact field order LiveKit expects
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("iss",   apiKey);
            payload.put("sub",   participantName);
            payload.put("name",  participantName);
            payload.put("video", videoGrant);
            payload.put("iat",   nowSec);
            payload.put("nbf",   nowSec);
            payload.put("exp",   expSec);

            // 4. Base64url-encode header + payload
            String encHeader  = b64url(mapper.writeValueAsBytes(header));
            String encPayload = b64url(mapper.writeValueAsBytes(payload));
            String signingInput = encHeader + "." + encPayload;

            // 5. HMAC-SHA256 sign with raw secret bytes
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(
                apiSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String encSignature = b64url(mac.doFinal(
                signingInput.getBytes(StandardCharsets.UTF_8)));

            String jwt = signingInput + "." + encSignature;

            log.debug("LiveKit token generated for room={} participant={} TOKEN={}", roomCode, participantName, jwt);
            return new LiveKitTokenResponse(jwt, roomCode, participantName);

        } catch (Exception e) {
            throw new RuntimeException("Failed to generate LiveKit token: " + e.getMessage(), e);
        }
    }

    private String b64url(byte[] data) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(data);
    }
}