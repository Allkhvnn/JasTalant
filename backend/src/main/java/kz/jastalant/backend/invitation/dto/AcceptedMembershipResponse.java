package kz.jastalant.backend.invitation.dto;

import kz.jastalant.backend.membership.entity.AcademyRole;

import java.util.Set;
import java.util.UUID;

public record AcceptedMembershipResponse(UUID academyId, UUID userId, Set<AcademyRole> roles) {}
