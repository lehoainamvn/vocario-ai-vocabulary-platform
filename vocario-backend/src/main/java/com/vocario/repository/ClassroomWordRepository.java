package com.vocario.repository;

import com.vocario.entity.ClassroomWord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ClassroomWordRepository extends JpaRepository<ClassroomWord, UUID> {
    List<ClassroomWord> findByClassroomIdOrderByCreatedAtAsc(UUID classroomId);
    long countByClassroomId(UUID classroomId);
    void deleteByClassroomId(UUID classroomId);
}
