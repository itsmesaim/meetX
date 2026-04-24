package com.meetx.repository;

import com.meetx.model.Room;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

public interface RoomRepository extends MongoRepository<Room, String> {

  Optional<Room> findByRoomCode(String roomCode);

  boolean existsByRoomCode(String roomCode);

  // Find active rooms that have been empty for longer than the given threshold
  // Used by the scheduler to auto-close abandoned rooms
  @Query("{ 'active': true, 'participantCount': 0, 'lastEmptyAt': { $lte: ?0 } }")
  List<Room> findAbandonedRooms(LocalDateTime emptyBefore);
}
