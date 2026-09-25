package kz.jastalant.backend.academy.repository;

import kz.jastalant.backend.academy.entity.Academy;

import org.springframework.data.repository.Repository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;

import java.util.Optional;
import java.util.UUID;

public interface AcademyRepository extends Repository<Academy, UUID> {
    Academy save(Academy academy);
    void flush();
    Optional<Academy> findById(UUID id);
    Page<Academy> findAll(Pageable pageable);
    Page<Academy> findAllByStatus(kz.jastalant.backend.academy.entity.AcademyStatus status, Pageable pageable);
    Page<Academy> findAllByNameContainingIgnoreCase(String search, Pageable pageable);
    Page<Academy> findAllByStatusAndNameContainingIgnoreCase(
            kz.jastalant.backend.academy.entity.AcademyStatus status, String search, Pageable pageable);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select academy from Academy academy where academy.id = :id")
    Optional<Academy> lockById(@Param("id") UUID id);
}
