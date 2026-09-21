package kz.jastalant.backend.development.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record DevelopmentAssessmentResponse(
        UUID id, UUID playerId, LocalDate assessmentDate,
        BigDecimal technique, BigDecimal speed, BigDecimal endurance,
        BigDecimal physicalFitness, BigDecimal gameIntelligence, String comment,
        UUID createdByUserId, String createdByName, Instant createdAt, Instant updatedAt, long version) {}
