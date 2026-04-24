package com.meetx.repository;

import com.meetx.model.ChatMessage;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ChatMessageRepository extends MongoRepository<ChatMessage, String> {

  List<ChatMessage> findByRoomCodeOrderByTimestampAsc(String roomCode);
}
