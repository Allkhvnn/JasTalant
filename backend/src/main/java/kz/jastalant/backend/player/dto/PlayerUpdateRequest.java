package kz.jastalant.backend.player.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record PlayerUpdateRequest(@NotNull @Valid PlayerRequest details,
                                  @NotNull @PositiveOrZero Long version) {}
