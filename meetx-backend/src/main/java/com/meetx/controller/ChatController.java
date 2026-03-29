package com.meetx.controller;

import com.meetx.model.ChatMessage;
import com.meetx.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Handles both WebSocket STOMP messages and the REST history endpoint.
 *
 * ─── WebSocket flow ────────────────────────────────────────────────────────────
 *  1. Client connects to ws://localhost:8080/ws  (STOMP over WebSocket or SockJS)
 *  2. Client subscribes to  /topic/chat/{roomCode}
 *  3. Client sends a message to /app/chat/{roomCode}
 *     Payload (JSON): { "sender": "Alice", "content": "Hello!" }
 *  4. Server persists to MongoDB, then broadcasts to /topic/chat/{roomCode}
 *     so every subscriber in that room receives the saved ChatMessage.
 *
 * ─── REST endpoint ─────────────────────────────────────────────────────────────
 *  GET /api/chat/{roomCode}/history  [JWT required]
 *  Returns all messages for the given room in ascending timestamp order.
 */
@Slf4j
@Controller
@CrossOrigin(origins = "*")
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final ChatMessageRepository chatMessageRepository;

    public ChatController(SimpMessagingTemplate messagingTemplate,
                          ChatMessageRepository chatMessageRepository) {
        this.messagingTemplate = messagingTemplate;
        this.chatMessageRepository = chatMessageRepository;
    }

    // ── WebSocket STOMP handler ───────────────────────────────────────────────

    /**
     * Receives a chat message sent to /app/chat/{roomCode},
     * stamps it, persists it, and broadcasts to /topic/chat/{roomCode}.
     *
     * @param roomCode       extracted from the STOMP destination path
     * @param incomingMessage partial ChatMessage with sender + content populated by client
     */
    @MessageMapping("/chat/{roomCode}")
    public void handleChatMessage(
            @DestinationVariable String roomCode,
            @Payload ChatMessage incomingMessage) {

        ChatMessage saved = ChatMessage.builder()
                .roomCode(roomCode)
                .sender(incomingMessage.getSender())
                .content(incomingMessage.getContent())
                .timestamp(LocalDateTime.now())
                .build();

        chatMessageRepository.save(saved);

        log.debug("[WS] room={} sender='{}' content='{}'",
                roomCode, saved.getSender(), saved.getContent());

        // Broadcast the fully-saved message (includes id + timestamp) to all subscribers
        messagingTemplate.convertAndSend("/topic/chat/" + roomCode, saved);
    }

    // ── REST: chat history ────────────────────────────────────────────────────

    /**
     * GET /api/chat/{roomCode}/history   [JWT required]
     *
     * Returns all chat messages for the room ordered by timestamp ascending.
     * Useful on initial page load to hydrate the chat panel.
     *
     * Response (200 OK):
     * {
     *   "success": true,
     *   "message": "Chat history",
     *   "data": [ { "id": "...", "roomCode": "A3F9-BC12", "sender": "Alice",
     *               "content": "Hello!", "timestamp": "2024-03-01T10:15:30" }, ... ]
     * }
     */
    @RestController
    @RequestMapping("/api/chat")
    class ChatHistoryController {

        @GetMapping("/{roomCode}/history")
        public com.meetx.dto.ApiResponse<List<ChatMessage>> getChatHistory(
                @PathVariable String roomCode) {

            List<ChatMessage> messages =
                    chatMessageRepository.findByRoomCodeOrderByTimestampAsc(roomCode);

            return com.meetx.dto.ApiResponse.success("Chat history", messages);
        }
    }
}
