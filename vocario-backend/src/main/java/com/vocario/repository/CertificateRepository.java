package com.vocario.repository;

import com.vocario.entity.Certificate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CertificateRepository extends JpaRepository<Certificate, UUID> {

    List<Certificate> findByUserIdOrderByIssueDateDesc(UUID userId);

    Optional<Certificate> findByCertificateCode(String certificateCode);

    Optional<Certificate> findByUserIdAndCefrLevel(UUID userId, String cefrLevel);

    boolean existsByUserIdAndCefrLevel(UUID userId, String cefrLevel);

    List<Certificate> findAllByOrderByCreatedAtDesc();

    long countByCefrLevel(String cefrLevel);

    void deleteByUserId(UUID userId);
}
