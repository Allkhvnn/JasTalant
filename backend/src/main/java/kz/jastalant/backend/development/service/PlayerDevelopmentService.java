package kz.jastalant.backend.development.service;

import kz.jastalant.backend.academy.service.AcademyPermissionService;
import kz.jastalant.backend.common.dto.PageResponse;
import kz.jastalant.backend.common.exception.BusinessException;
import kz.jastalant.backend.common.exception.ErrorCode;
import kz.jastalant.backend.common.service.PageRequests;
import kz.jastalant.backend.development.dto.*;
import kz.jastalant.backend.development.entity.PlayerDevelopmentAssessment;
import kz.jastalant.backend.development.repository.PlayerDevelopmentAssessmentRepository;
import kz.jastalant.backend.group.service.GroupService;
import kz.jastalant.backend.player.repository.PlayerRepository;
import kz.jastalant.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlayerDevelopmentService {
    private final PlayerDevelopmentAssessmentRepository assessments;
    private final PlayerRepository players;
    private final UserRepository users;
    private final GroupService groups;
    private final AcademyPermissionService permissions;
    private final Clock clock;

    public PageResponse<DevelopmentAssessmentResponse> list(
            UUID actor, UUID academyId, UUID playerId, int page, int size) {
        requireVisiblePlayer(actor, academyId, playerId);
        return history(academyId, playerId, page, size);
    }

    @Transactional
    public DevelopmentAssessmentResponse create(
            UUID actor, UUID academyId, UUID playerId, DevelopmentAssessmentRequest request) {
        requireVisiblePlayer(actor, academyId, playerId);
        validateDate(request.assessmentDate());
        if (assessments.existsByAcademyIdAndPlayerIdAndAssessmentDate(
                academyId, playerId, request.assessmentDate())) {
            throw duplicateDate();
        }
        var author = users.findById(actor)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHENTICATED));
        var entity = assessments.save(new PlayerDevelopmentAssessment(
                academyId, playerId, request.assessmentDate(), request.technique(), request.speed(),
                request.endurance(), request.physicalFitness(), request.gameIntelligence(), request.comment(),
                author, clock.instant()));
        assessments.flush();
        return response(entity);
    }

    @Transactional
    public DevelopmentAssessmentResponse update(UUID actor, UUID academyId, UUID playerId, UUID assessmentId,
            DevelopmentAssessmentUpdateRequest request) {
        requireVisiblePlayer(actor, academyId, playerId);
        validateDate(request.details().assessmentDate());
        var entity = find(academyId, playerId, assessmentId);
        if (entity.getVersion() != request.version()) {
            throw new BusinessException(ErrorCode.CONFLICT, "Assessment has changed; reload it before saving");
        }
        if (assessments.existsByAcademyIdAndPlayerIdAndAssessmentDateAndIdNot(
                academyId, playerId, request.details().assessmentDate(), assessmentId)) {
            throw duplicateDate();
        }
        var details = request.details();
        entity.update(details.assessmentDate(), details.technique(), details.speed(), details.endurance(),
                details.physicalFitness(), details.gameIntelligence(), details.comment(), clock.instant());
        assessments.flush();
        return response(entity);
    }

    @Transactional
    public void delete(UUID actor, UUID academyId, UUID playerId, UUID assessmentId) {
        requireVisiblePlayer(actor, academyId, playerId);
        assessments.delete(find(academyId, playerId, assessmentId));
        assessments.flush();
    }

    public PageResponse<DevelopmentAssessmentResponse> parentHistory(
            UUID academyId, UUID playerId, int page, int size) {
        return history(academyId, playerId, page, size);
    }

    private PageResponse<DevelopmentAssessmentResponse> history(
            UUID academyId, UUID playerId, int page, int size) {
        var pageable = PageRequests.of(page, size, Sort.by(
                Sort.Order.desc("assessmentDate"), Sort.Order.desc("id")));
        var result = assessments.findAllByAcademyIdAndPlayerId(academyId, playerId, pageable);
        return new PageResponse<>(result.map(this::response).getContent(), page, size, result.getTotalElements());
    }

    private void requireVisiblePlayer(UUID actor, UUID academyId, UUID playerId) {
        var scope = permissions.resolve(actor, academyId);
        scope.requireStaff();
        var player = players.findByAcademyIdAndId(academyId, playerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Player not found"));
        groups.requireVisible(scope, academyId, player.getGroupId());
    }

    private PlayerDevelopmentAssessment find(UUID academyId, UUID playerId, UUID assessmentId) {
        return assessments.findByAcademyIdAndPlayerIdAndId(academyId, playerId, assessmentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Assessment not found"));
    }

    private void validateDate(LocalDate date) {
        if (date.isAfter(LocalDate.now(clock))) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Assessment cannot be recorded for a future date");
        }
    }

    private BusinessException duplicateDate() {
        return new BusinessException(ErrorCode.CONFLICT, "An assessment already exists for this date");
    }

    private DevelopmentAssessmentResponse response(PlayerDevelopmentAssessment value) {
        return new DevelopmentAssessmentResponse(value.getId(), value.getPlayerId(), value.getAssessmentDate(),
                value.getTechnique(), value.getSpeed(), value.getEndurance(), value.getPhysicalFitness(),
                value.getGameIntelligence(), value.getComment(), value.getCreatedBy().getId(),
                value.getCreatedBy().getFullName(), value.getCreatedAt(), value.getUpdatedAt(), value.getVersion());
    }
}
