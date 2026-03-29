package com.meetx.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Server → client: broadcasts sent to /topic/... are relayed by the broker
        registry.enableSimpleBroker("/topic");

        // Client → server: messages sent to /app/... are routed to @MessageMapping methods
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Native WebSocket endpoint — connect via ws://localhost:8080/ws
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");

        // SockJS fallback — for environments that block native WebSocket (e.g. some proxies)
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}
