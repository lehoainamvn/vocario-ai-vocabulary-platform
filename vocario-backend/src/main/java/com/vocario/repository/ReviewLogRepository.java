package com.vocario.repository;

import com.vocario.entity.ReviewLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReviewLogRepository extends JpaRepository<ReviewLog, UUID> {
    List<ReviewLog> findByUserIdOrderByReviewedAtDesc(UUID userId);
    List<ReviewLog> findTop10ByUserIdOrderByReviewedAtDesc(UUID userId);
    long countByUserId(UUID userId);
    long countByUserIdAndReviewedAtAfter(UUID userId, java.time.OffsetDateTime after);

    List<ReviewLog> findByReviewTypeOrderByReviewedAtDesc(String reviewType);
    org.springframework.data.domain.Page<ReviewLog> findByReviewTypeOrderByReviewedAtDesc(String reviewType, org.springframework.data.domain.Pageable pageable);
    long countByReviewType(String reviewType);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByUserId(UUID userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByProgressId(UUID progressId);
}
