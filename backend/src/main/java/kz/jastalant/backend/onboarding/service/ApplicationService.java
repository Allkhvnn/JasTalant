package kz.jastalant.backend.onboarding.service;

import kz.jastalant.backend.academy.entity.Academy;
import kz.jastalant.backend.academy.repository.AcademyRepository;
import kz.jastalant.backend.membership.entity.AcademyMembership;
import kz.jastalant.backend.membership.entity.AcademyRole;
import kz.jastalant.backend.membership.repository.AcademyMembershipRepository;
import kz.jastalant.backend.onboarding.dto.ApplicationView;
import kz.jastalant.backend.onboarding.mapper.ApplicationMapper;
import kz.jastalant.backend.onboarding.entity.AcademyApplication;
import kz.jastalant.backend.onboarding.entity.ApplicationStatus;
import kz.jastalant.backend.onboarding.repository.AcademyApplicationRepository;
import kz.jastalant.backend.user.entity.PlatformRole;
import kz.jastalant.backend.user.entity.User;
import kz.jastalant.backend.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import kz.jastalant.backend.common.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import kz.jastalant.backend.common.exception.BusinessException;
import java.time.Clock;
import kz.jastalant.backend.onboarding.dto.ApplicationPage;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ApplicationService {
    private final AcademyApplicationRepository applications;
    private final AcademyRepository academies;
    private final AcademyMembershipRepository memberships;
    private final UserRepository users;
    private final Clock clock;

    @Transactional(readOnly = true)
    public ApplicationView mine(UUID userId) {
        return applications.findByApplicantId(userId).map(ApplicationMapper::toView)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Application not found"));
    }

    @Transactional(readOnly = true)
    public ApplicationPage list(UUID actor, ApplicationStatus status, int page, int size) {
        requireOwner(actor);
        if (page < 0 || size < 1 || size > 100) throw new BusinessException(ErrorCode.INVALID_REQUEST, "Invalid page or size");
        var result = applications.findAllByStatus(status, PageRequest.of(page, size, Sort.by("createdAt").and(Sort.by("id"))));
        return new ApplicationPage(result.map(ApplicationMapper::toView).getContent(), page, size, result.getTotalElements());
    }

    @Transactional
    public ApplicationView approve(UUID actor, UUID id) {
        requireOwner(actor);
        var application = pending(id);
        if (!application.getApplicant().isEmailVerified()) throw new BusinessException(ErrorCode.CONFLICT, "Email must be verified");
        var academy = academies.save(new Academy(application.getAcademyName()));
        memberships.save(new AcademyMembership(academy, application.getApplicant(), AcademyRole.ADMIN));
        application.approve(academy.getId(), actor, clock.instant());
        return ApplicationMapper.toView(application);
    }

    @Transactional
    public ApplicationView reject(UUID actor, UUID id, String reason) {
        requireOwner(actor);
        var application = pending(id);
        application.reject(reason, actor, clock.instant());
        return ApplicationMapper.toView(application);
    }

    private AcademyApplication pending(UUID id) {
        var application = applications.lockById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Application not found"));
        if (application.getStatus() != ApplicationStatus.PENDING) {
            throw new BusinessException(ErrorCode.CONFLICT, "Only pending applications can be reviewed");
        }
        return application;
    }

    private void requireOwner(UUID id) {
        var user = users.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHENTICATED));
        if (!user.isEmailVerified() || user.getPlatformRole() != PlatformRole.SUPER_ADMIN) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
    }
}
