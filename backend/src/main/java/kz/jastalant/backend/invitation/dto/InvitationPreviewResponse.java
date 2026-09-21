package kz.jastalant.backend.invitation.dto;

import kz.jastalant.backend.membership.entity.AcademyRole;

import java.time.Instant;
import java.util.Set;

public record InvitationPreviewResponse(String academyName, String maskedEmail,
                                        Set<AcademyRole> roles, Instant expiresAt) {}
