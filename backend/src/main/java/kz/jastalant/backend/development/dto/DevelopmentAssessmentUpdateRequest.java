package kz.jastalant.backend.development.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record DevelopmentAssessmentUpdateRequest(
        @PositiveOrZero long version,
        @NotNull @Valid DevelopmentAssessmentRequest details) {}
