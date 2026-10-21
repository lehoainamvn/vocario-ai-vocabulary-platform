package com.vocario.repository;

import com.vocario.entity.Word;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WordRepository extends JpaRepository<Word, UUID> {
    Optional<Word> findByWordIgnoreCase(String word);
    boolean existsByWordIgnoreCase(String word);
    List<Word> findByCefrLevel(String cefrLevel);
    long countByCefrLevel(String cefrLevel);
    List<Word> findByCategory(String category);
    List<Word> findByWordContainingIgnoreCase(String keyword);

    @Query("SELECT w FROM Word w WHERE " +
           "(:cefrLevel IS NULL OR :cefrLevel = '' OR UPPER(w.cefrLevel) = UPPER(:cefrLevel)) AND " +
           "(:partOfSpeech IS NULL OR :partOfSpeech = '' OR UPPER(w.partOfSpeech) = UPPER(:partOfSpeech)) AND " +
           "(:search IS NULL OR :search = '' OR " +
           " LOWER(w.word) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(w.vietnameseMeaning) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(COALESCE(w.phoneticIpa, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(COALESCE(w.category, '')) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Word> searchWordsPaged(
            @Param("search") String search,
            @Param("cefrLevel") String cefrLevel,
            @Param("partOfSpeech") String partOfSpeech,
            Pageable pageable
    );
}

