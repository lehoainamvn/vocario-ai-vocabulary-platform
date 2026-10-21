package com.vocario.repository;

import com.vocario.entity.Classroom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClassroomRepository extends JpaRepository<Classroom, UUID> {
    Optional<Classroom> findByCode(String code);
    List<Classroom> findByOwnerIdOrderByCreatedAtDesc(UUID ownerId);

    @Query("SELECT cm.classroom FROM ClassroomMember cm WHERE cm.user.id = :userId ORDER BY cm.joinedAt DESC")
    List<Classroom> findJoinedClassroomsByUserId(@Param("userId") UUID userId);
}
