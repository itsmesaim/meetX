package com.meetx.repository;

import com.meetx.model.ChatMessage;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {

    List<ChatMessage> findByRoomCodeOrderByTimestampAsc(String roomCode);
}
