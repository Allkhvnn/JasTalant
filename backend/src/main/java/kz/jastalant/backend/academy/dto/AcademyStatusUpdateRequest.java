package kz.jastalant.backend.academy.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import kz.jastalant.backend.academy.entity.AcademyStatus;

public record AcademyStatusUpdateRequest(
        @NotNull AcademyStatus status,
        @Size(max = 500) String reason,
        @NotNull Long version) {}
