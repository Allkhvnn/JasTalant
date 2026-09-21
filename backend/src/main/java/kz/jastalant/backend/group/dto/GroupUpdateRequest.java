package kz.jastalant.backend.group.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record GroupUpdateRequest(@NotNull @Valid GroupRequest details,
                                 @NotNull @PositiveOrZero Long version) {}
