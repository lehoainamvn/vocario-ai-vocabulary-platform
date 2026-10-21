package com.vocario.repository;

import com.vocario.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);

    long countByRole(String role);
    long countByLastActiveAtAfter(OffsetDateTime date);

    @Query("SELECT u FROM User u WHERE " +
           "(:keyword IS NULL OR :keyword = '' OR " +
           " LOWER(COALESCE(u.fullName, '')) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')) OR " +
           " LOWER(u.email) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')) OR " +
           " LOWER(u.username) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%'))) AND " +
           "(:role IS NULL OR :role = '' OR :role = 'ALL' OR UPPER(u.role) = UPPER(CAST(:role AS string))) AND " +
           "(:targetLevel IS NULL OR :targetLevel = '' OR :targetLevel = 'ALL' OR UPPER(u.targetLevel) = UPPER(CAST(:targetLevel AS string)))")
    Page<User> searchUsersPaged(@Param("keyword") String keyword,
                                @Param("role") String role,
                                @Param("targetLevel") String targetLevel,
                                Pageable pageable);
}
