package com.vocario.repository;

import com.vocario.entity.CertificateType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CertificateTypeRepository extends JpaRepository<CertificateType, UUID> {

    Optional<CertificateType> findByTypeCode(String typeCode);

    boolean existsByTypeCode(String typeCode);

    List<CertificateType> findAllByOrderByCreatedAtAsc();
}
