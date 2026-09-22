package kz.jastalant.backend.membership.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import kz.jastalant.backend.membership.entity.AcademyRole;

import java.util.Set;

public record AcademyMemberUpdateRequest(
        @PositiveOrZero long version,
        @NotEmpty Set<@NotNull AcademyRole> roles,
        boolean active) {}
