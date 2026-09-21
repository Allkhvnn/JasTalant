package kz.jastalant.backend.training.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record ScheduledTrainingUpdateRequest(
        @PositiveOrZero long version,
        @NotNull @Valid ScheduledTrainingRequest details) {}
