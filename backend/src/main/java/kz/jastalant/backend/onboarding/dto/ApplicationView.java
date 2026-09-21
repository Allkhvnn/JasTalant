package kz.jastalant.backend.onboarding.dto;

import kz.jastalant.backend.onboarding.entity.ApplicationStatus;

import java.time.Instant;
import java.util.UUID;

public record ApplicationView(UUID id, UUID applicantId, String applicantName, String applicantEmail,
                              String academyName, ApplicationStatus status, UUID academyId,
                              String rejectionReason, Instant createdAt, Instant reviewedAt) {}
