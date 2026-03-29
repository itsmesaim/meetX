package com.meetx.repository;

import com.meetx.model.Room;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface RoomRepository extends MongoRepository<Room, String> {

    Optional<Room> findByRoomCode(String roomCode);

    boolean existsByRoomCode(String roomCode);
}
