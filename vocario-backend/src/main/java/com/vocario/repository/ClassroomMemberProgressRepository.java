package com.vocario.repository;

import com.vocario.entity.ClassroomMemberProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClassroomMemberProgressRepository extends JpaRepository<ClassroomMemberProgress, UUID> {
    Optional<ClassroomMemberProgress> findByClassroomIdAndUserId(UUID classroomId, UUID userId);
    List<ClassroomMemberProgress> findByClassroomIdOrderByLastStudiedAtDesc(UUID classroomId);
    List<ClassroomMemberProgress> findByClassroomId(UUID classroomId);
    long countByClassroomId(UUID classroomId);
    void deleteByClassroomId(UUID classroomId);
    void deleteByUserId(UUID userId);
}
