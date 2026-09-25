package kz.jastalant.backend.academy.dto;

import kz.jastalant.backend.academy.entity.AcademyStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PlatformAcademyView(
        UUID id,
        String name,
        AcademyStatus status,
        String statusReason,
        Instant createdAt,
        Instant statusChangedAt,
        UUID statusChangedBy,
        long version,
        long playerCount,
        long groupCount,
        long activeCoachCount,
        long activeMemberCount,
        List<PlatformAcademyAdminView> administrators) {}
