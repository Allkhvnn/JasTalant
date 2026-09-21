package kz.jastalant.backend.invitation.dto;

import kz.jastalant.backend.invitation.entity.InvitationStatus;
import kz.jastalant.backend.membership.entity.AcademyRole;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

public record InvitationResponse(UUID id, UUID academyId, String email, Set<AcademyRole> roles,
                                 Set<UUID> playerIds, InvitationStatus status, boolean expired,
                                 Instant expiresAt, Instant createdAt, Instant acceptedAt) {}
