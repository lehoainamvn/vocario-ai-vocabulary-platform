package com.vocario.repository;

import com.vocario.entity.UserWordProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserWordProgressRepository extends JpaRepository<UserWordProgress, UUID> {
    
    Optional<UserWordProgress> findByUserIdAndWordId(UUID userId, UUID wordId);

    @Query("SELECT p FROM UserWordProgress p JOIN FETCH p.word WHERE p.user.id = :userId AND LOWER(p.word.word) = LOWER(:word)")
    Optional<UserWordProgress> findByUserIdAndWordText(@Param("userId") UUID userId, @Param("word") String word);

    // Lấy các thẻ từ vựng đã đến hạn ôn tập của người dùng (SM-2 Queue)
    @Query("SELECT p FROM UserWordProgress p JOIN FETCH p.word WHERE p.user.id = :userId AND p.nextReviewDate <= :now ORDER BY p.nextReviewDate ASC")
    List<UserWordProgress> findDueReviews(@Param("userId") UUID userId, @Param("now") OffsetDateTime now);

    // Thống kê số lượng từ theo trạng thái
    long countByUserIdAndStatus(UUID userId, String status);
    long countByUserIdAndStatusAndUpdatedAtAfter(UUID userId, String status, OffsetDateTime after);
    long countByStatus(String status);

    List<UserWordProgress> findByUserId(UUID userId);

    // Lấy toàn bộ từ vựng cá nhân của người dùng kèm chi tiết từ và ảnh bối cảnh
    @Query("SELECT p FROM UserWordProgress p JOIN FETCH p.word LEFT JOIN FETCH p.capture WHERE p.user.id = :userId ORDER BY p.updatedAt DESC")
    List<UserWordProgress> findUserWordsWithDetails(@Param("userId") UUID userId);

    long countByWordId(UUID wordId);
    long countByUserId(UUID userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByWordId(UUID wordId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByUserId(UUID userId);

    @Query("SELECT AVG(p.easinessFactor) FROM UserWordProgress p WHERE p.user.id = :userId")
    Double getAverageEasinessFactor(@Param("userId") UUID userId);

    List<UserWordProgress> findByCaptureId(UUID captureId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("UPDATE UserWordProgress u SET u.capture = null WHERE u.capture.id = :captureId")
    void detachCaptureFromProgress(@Param("captureId") UUID captureId);
}

