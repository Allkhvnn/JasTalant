package kz.jastalant.backend.academy.repository;

import kz.jastalant.backend.academy.entity.Academy;

import org.springframework.data.repository.Repository;

import java.util.Optional;
import java.util.UUID;

public interface AcademyRepository extends Repository<Academy, UUID> {
    Academy save(Academy academy);
    Optional<Academy> findById(UUID id);
}
