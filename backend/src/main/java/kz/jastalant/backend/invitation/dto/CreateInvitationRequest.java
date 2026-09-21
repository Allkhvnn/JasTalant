package kz.jastalant.backend.invitation.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import kz.jastalant.backend.membership.entity.AcademyRole;

import java.util.Set;
import java.util.UUID;

public record CreateInvitationRequest(
        @NotBlank @Email @Size(max = 254) String email,
        @NotEmpty Set<AcademyRole> roles,
        Set<UUID> playerIds) {}
