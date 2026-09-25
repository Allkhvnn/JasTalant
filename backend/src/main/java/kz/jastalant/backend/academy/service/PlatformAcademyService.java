package kz.jastalant.backend.academy.service;

import java.time.Clock;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import kz.jastalant.backend.academy.dto.*;
import kz.jastalant.backend.academy.entity.Academy;
import kz.jastalant.backend.academy.entity.AcademyStatus;
import kz.jastalant.backend.academy.repository.AcademyRepository;
import kz.jastalant.backend.common.exception.BusinessException;
import kz.jastalant.backend.common.exception.ErrorCode;
import kz.jastalant.backend.group.repository.TrainingGroupRepository;
import kz.jastalant.backend.membership.entity.AcademyRole;
import kz.jastalant.backend.membership.repository.AcademyMembershipRepository;
import kz.jastalant.backend.player.repository.PlayerRepository;
import kz.jastalant.backend.user.entity.PlatformRole;
import kz.jastalant.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PlatformAcademyService {
    private final AcademyRepository academies;
    private final AcademyMembershipRepository memberships;
    private final PlayerRepository players;
    private final TrainingGroupRepository groups;
    private final UserRepository users;
    private final Clock clock;

    @Transactional(readOnly = true)
    public PlatformAcademyPage list(UUID actor, AcademyStatus status, String search, int page, int size) {
        requireOwner(actor);
        if (page < 0 || size < 1 || size > 100) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Invalid page or size");
        }
        String normalizedSearch = search == null || search.isBlank() ? null : search.strip();
        if (normalizedSearch != null && normalizedSearch.length() > 200) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Search is too long");
        }
        var pageable = PageRequest.of(page, size, Sort.by("name").ascending().and(Sort.by("id")));
        var result = status == null
                ? normalizedSearch == null ? academies.findAll(pageable)
                        : academies.findAllByNameContainingIgnoreCase(normalizedSearch, pageable)
                : normalizedSearch == null ? academies.findAllByStatus(status, pageable)
                        : academies.findAllByStatusAndNameContainingIgnoreCase(status, normalizedSearch, pageable);
        return new PlatformAcademyPage(result.getContent().stream().map(this::toView).toList(),
                page, size, result.getTotalElements());
    }

    @Transactional(readOnly = true)
    public PlatformAcademyView get(UUID actor, UUID academyId) {
        requireOwner(actor);
        return toView(find(academyId));
    }

    @Transactional
    public PlatformAcademyView changeStatus(UUID actor, UUID academyId, AcademyStatusUpdateRequest request) {
        requireOwner(actor);
        var academy = academies.lockById(academyId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Academy not found"));
        if (academy.getVersion() != request.version()) {
            throw new BusinessException(ErrorCode.CONFLICT, "The academy has changed; reload it before saving");
        }
        String reason = request.reason() == null ? "" : request.reason().strip();
        if (request.status() != AcademyStatus.ACTIVE && reason.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "A reason is required for this status");
        }
        if (academy.getStatus() != request.status()) {
            academy.changeStatus(request.status(), reason, actor, clock.instant());
            academies.flush();
        }
        return toView(academy);
    }

    private Academy find(UUID academyId) {
        return academies.findById(academyId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Academy not found"));
    }

    private PlatformAcademyView toView(Academy academy) {
        var administrators = memberships.findAllByAcademyIdAndRoleWithUser(academy.getId(), AcademyRole.ADMIN)
                .stream().map(membership -> new PlatformAcademyAdminView(membership.getUser().getId(),
                        membership.getUser().getFullName(), membership.getUser().getEmail())).toList();
        return new PlatformAcademyView(academy.getId(), academy.getName(), academy.getStatus(),
                academy.getStatusReason(), academy.getCreatedAt(), academy.getStatusChangedAt(),
                academy.getStatusChangedBy(), academy.getVersion(), players.countByAcademyId(academy.getId()),
                groups.countByAcademyId(academy.getId()),
                memberships.countActiveByAcademyIdAndRole(academy.getId(), AcademyRole.COACH),
                memberships.countByAcademyIdAndActiveTrue(academy.getId()), administrators);
    }

    private void requireOwner(UUID actor) {
        var user = users.findById(actor).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHENTICATED));
        if (!user.isEmailVerified() || user.getPlatformRole() != PlatformRole.SUPER_ADMIN) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
    }
}
