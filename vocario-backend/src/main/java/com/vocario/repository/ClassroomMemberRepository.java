package com.vocario.repository;

import com.vocario.entity.ClassroomMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClassroomMemberRepository extends JpaRepository<ClassroomMember, UUID> {
    Optional<ClassroomMember> findByClassroomIdAndUserId(UUID classroomId, UUID userId);
    List<ClassroomMember> findByClassroomId(UUID classroomId);
    long countByClassroomId(UUID classroomId);
    boolean existsByClassroomIdAndUserId(UUID classroomId, UUID userId);
    void deleteByClassroomId(UUID classroomId);
    void deleteByUserId(UUID userId);
}
