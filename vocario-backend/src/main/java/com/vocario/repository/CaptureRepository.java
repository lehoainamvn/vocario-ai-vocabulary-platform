package com.vocario.repository;

import com.vocario.entity.Capture;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CaptureRepository extends JpaRepository<Capture, UUID> {
    List<Capture> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<Capture> findTop10ByUserIdOrderByCreatedAtDesc(UUID userId);
    long countByUserId(UUID userId);
    long countByUserIdAndCreatedAtAfter(UUID userId, java.time.OffsetDateTime after);

    @Query("SELECT c FROM Capture c " +
           "WHERE (:theme = '' OR :theme = 'ALL' OR LOWER(COALESCE(c.sceneTheme, '')) = LOWER(:theme)) " +
           "AND (:keyword = '' OR LOWER(COALESCE(c.sceneTheme, '')) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')) " +
           "     OR LOWER(COALESCE(c.user.fullName, '')) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')) " +
           "     OR LOWER(COALESCE(c.user.email, '')) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')) " +
           "     OR LOWER(COALESCE(c.detectedObjects, '')) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%'))) " +
           "ORDER BY c.createdAt DESC")
    Page<Capture> searchCapturesPaged(@Param("theme") String theme, @Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT DISTINCT c.sceneTheme FROM Capture c WHERE c.sceneTheme IS NOT NULL AND TRIM(c.sceneTheme) != ''")
    List<String> findDistinctSceneThemes();

    long countBySceneTheme(String sceneTheme);

    void deleteByUserId(UUID userId);
}
