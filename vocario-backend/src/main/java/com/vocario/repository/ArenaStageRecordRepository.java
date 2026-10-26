package com.vocario.repository;

import com.vocario.entity.ArenaStageRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ArenaStageRecordRepository extends JpaRepository<ArenaStageRecord, UUID> {

    List<ArenaStageRecord> findTop10ByStageIdOrderByCompletionTimeMsAscAccuracyPctDesc(String stageId);

    List<ArenaStageRecord> findTop10ByStageIdAndAchievedAtAfterOrderByCompletionTimeMsAscAccuracyPctDesc(
            String stageId, OffsetDateTime since);

    List<ArenaStageRecord> findByStageIdAndUserIdOrderByCompletionTimeMsAsc(String stageId, UUID userId);

    @Query("SELECT r FROM ArenaStageRecord r WHERE r.stageId = :stageId ORDER BY r.completionTimeMs ASC, r.accuracyPct DESC")
    List<ArenaStageRecord> findAllByStageIdOrdered(@Param("stageId") String stageId);
}
