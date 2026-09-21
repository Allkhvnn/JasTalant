package kz.jastalant.backend.development.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public record DevelopmentAssessmentRequest(
        @NotNull LocalDate assessmentDate,
        @NotNull @DecimalMin("0.0") @DecimalMax("10.0") @Digits(integer = 2, fraction = 1) BigDecimal technique,
        @NotNull @DecimalMin("0.0") @DecimalMax("10.0") @Digits(integer = 2, fraction = 1) BigDecimal speed,
        @NotNull @DecimalMin("0.0") @DecimalMax("10.0") @Digits(integer = 2, fraction = 1) BigDecimal endurance,
        @NotNull @DecimalMin("0.0") @DecimalMax("10.0") @Digits(integer = 2, fraction = 1) BigDecimal physicalFitness,
        @NotNull @DecimalMin("0.0") @DecimalMax("10.0") @Digits(integer = 2, fraction = 1) BigDecimal gameIntelligence,
        @Size(max = 500) String comment) {}
