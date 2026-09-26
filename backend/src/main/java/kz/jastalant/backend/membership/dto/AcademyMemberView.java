package kz.jastalant.backend.membership.dto;

import kz.jastalant.backend.membership.entity.AcademyRole;

import java.util.Set;
import java.time.Instant;
import java.util.UUID;

public record AcademyMemberView(UUID membershipId, UUID userId, String fullName, String email,
                                Set<AcademyRole> roles, boolean active, boolean hasAvatar,
                                long version, Instant createdAt) {}
