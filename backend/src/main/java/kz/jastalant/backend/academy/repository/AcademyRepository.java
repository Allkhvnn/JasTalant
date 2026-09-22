package kz.jastalant.backend.academy.repository;

import kz.jastalant.backend.academy.entity.Academy;

import org.springframework.data.repository.Repository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.Optional;
import java.util.UUID;

public interface AcademyRepository extends Repository<Academy, UUID> {
    Academy save(Academy academy);
    Optional<Academy> findById(UUID id);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select academy from Academy academy where academy.id = :id")
    Optional<Academy> lockById(@Param("id") UUID id);
}
