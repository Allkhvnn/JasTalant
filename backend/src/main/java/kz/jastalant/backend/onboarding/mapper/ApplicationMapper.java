package kz.jastalant.backend.onboarding.mapper;

import kz.jastalant.backend.onboarding.dto.ApplicationView;
import kz.jastalant.backend.onboarding.entity.AcademyApplication;

public final class ApplicationMapper {
    private ApplicationMapper() {}

    public static ApplicationView toView(AcademyApplication application) {
        return new ApplicationView(application.getId(), application.getApplicant().getId(),
                application.getApplicant().getFullName(), application.getApplicant().getEmail(),
                application.getAcademyName(), application.getStatus(), application.getAcademyId(),
                application.getRejectionReason(), application.getCreatedAt(), application.getReviewedAt());
    }
}
