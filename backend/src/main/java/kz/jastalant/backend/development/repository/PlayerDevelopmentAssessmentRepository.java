package kz.jastalant.backend.development.repository;

import kz.jastalant.backend.development.entity.PlayerDevelopmentAssessment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.Repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface PlayerDevelopmentAssessmentRepository extends Repository<PlayerDevelopmentAssessment, UUID> {
    PlayerDevelopmentAssessment save(PlayerDevelopmentAssessment assessment);
    void delete(PlayerDevelopmentAssessment assessment);
    void flush();
    Page<PlayerDevelopmentAssessment> findAllByAcademyIdAndPlayerId(UUID academyId, UUID playerId, Pageable pageable);
    Optional<PlayerDevelopmentAssessment> findByAcademyIdAndPlayerIdAndId(UUID academyId, UUID playerId, UUID id);
    boolean existsByAcademyIdAndPlayerIdAndAssessmentDate(UUID academyId, UUID playerId, LocalDate assessmentDate);
    boolean existsByAcademyIdAndPlayerIdAndAssessmentDateAndIdNot(
            UUID academyId, UUID playerId, LocalDate assessmentDate, UUID id);
}
