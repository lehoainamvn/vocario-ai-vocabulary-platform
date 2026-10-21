package com.vocario.repository;

import com.vocario.entity.ClassroomQuizAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ClassroomQuizAttemptRepository extends JpaRepository<ClassroomQuizAttempt, UUID> {
    List<ClassroomQuizAttempt> findByClassroomIdOrderByScoreDescTimeSpentSecondsAsc(UUID classroomId);
    long countByClassroomId(UUID classroomId);
    void deleteByClassroomId(UUID classroomId);
    void deleteByUserId(UUID userId);
}
