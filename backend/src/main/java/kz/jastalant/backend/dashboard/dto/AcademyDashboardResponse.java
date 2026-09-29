package kz.jastalant.backend.dashboard.dto;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import kz.jastalant.backend.membership.entity.AcademyRole;
import kz.jastalant.backend.training.dto.ScheduledTrainingResponse;

public record AcademyDashboardResponse(
        UUID academyId,
        String academyName,
        Set<AcademyRole> roles,
        long groupCount,
        long playerCount,
        Long activeCoachCount,
        long upcomingTrainingCount,
        List<AgeDistributionItem> ageDistribution,
        List<ScheduledTrainingResponse> upcomingTrainings) {}
