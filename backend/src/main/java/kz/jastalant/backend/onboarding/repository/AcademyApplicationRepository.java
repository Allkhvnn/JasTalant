package kz.jastalant.backend.onboarding.repository;

import kz.jastalant.backend.onboarding.entity.AcademyApplication;
import kz.jastalant.backend.onboarding.entity.ApplicationStatus;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import java.util.Optional;
import java.util.UUID;

public interface AcademyApplicationRepository extends Repository<AcademyApplication, UUID> {
    AcademyApplication save(AcademyApplication application);
    Optional<AcademyApplication> findByApplicantId(UUID applicantId);
    Page<AcademyApplication> findAllByStatus(ApplicationStatus status, Pageable pageable);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from AcademyApplication a where a.id = :id")
    Optional<AcademyApplication> lockById(UUID id);
}
