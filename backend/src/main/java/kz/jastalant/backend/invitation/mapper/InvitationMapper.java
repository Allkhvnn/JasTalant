package kz.jastalant.backend.invitation.mapper;

import kz.jastalant.backend.invitation.dto.InvitationResponse;
import kz.jastalant.backend.invitation.entity.AcademyInvitation;

import java.time.Instant;

public final class InvitationMapper {
    private InvitationMapper() {}

    public static InvitationResponse toResponse(AcademyInvitation invitation, Instant now) {
        return new InvitationResponse(invitation.getId(), invitation.getAcademyId(), invitation.getEmail(),
                java.util.Set.copyOf(invitation.getRoles()), java.util.Set.copyOf(invitation.getPlayerIds()), invitation.getStatus(),
                invitation.isExpired(now), invitation.getExpiresAt(), invitation.getCreatedAt(),
                invitation.getAcceptedAt());
    }
}
