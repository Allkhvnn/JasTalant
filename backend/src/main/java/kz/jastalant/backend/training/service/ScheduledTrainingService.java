package kz.jastalant.backend.training.service;

import kz.jastalant.backend.academy.service.AcademyPermissionService;
import kz.jastalant.backend.common.exception.BusinessException;
import kz.jastalant.backend.common.exception.ErrorCode;
import kz.jastalant.backend.group.repository.GroupCoachRepository;
import kz.jastalant.backend.group.repository.TrainingGroupRepository;
import kz.jastalant.backend.group.service.GroupService;
import kz.jastalant.backend.membership.entity.AcademyMembership;
import kz.jastalant.backend.membership.entity.AcademyRole;
import kz.jastalant.backend.membership.repository.AcademyMembershipRepository;
import kz.jastalant.backend.training.dto.*;
import kz.jastalant.backend.training.entity.ScheduledTraining;
import kz.jastalant.backend.training.entity.TrainingStatus;
import kz.jastalant.backend.training.repository.ScheduledTrainingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScheduledTrainingService {
    private static final int MAX_RANGE_DAYS = 92;

    private final ScheduledTrainingRepository trainings;
    private final TrainingGroupRepository trainingGroups;
    private final GroupCoachRepository groupCoaches;
    private final AcademyMembershipRepository memberships;
    private final GroupService groups;
    private final AcademyPermissionService permissions;
    private final Clock clock;

    public List<ScheduledTrainingResponse> list(
            UUID actor, UUID academyId, LocalDate from, LocalDate to, UUID groupId) {
        validateRange(from, to);
        var scope = permissions.resolve(actor, academyId);
        scope.requireStaff();
        List<ScheduledTraining> result;
        if (groupId != null) {
            groups.requireVisible(scope, academyId, groupId);
            result = trainings.findAllByAcademyIdAndGroupIdAndTrainingDateBetweenOrderByTrainingDateAscStartTimeAscIdAsc(
                    academyId, groupId, from, to);
        } else if (scope.manager()) {
            result = trainings.findAllByAcademyIdAndTrainingDateBetweenOrderByTrainingDateAscStartTimeAscIdAsc(
                    academyId, from, to);
        } else {
            result = trainings.findAssigned(academyId, scope.membershipId(), from, to);
        }
        return result.stream().map(this::response).toList();
    }

    public ScheduledTrainingResponse get(UUID actor, UUID academyId, UUID trainingId) {
        return response(requireVisible(actor, academyId, trainingId));
    }

    @Transactional
    public ScheduledTrainingResponse create(
            UUID actor, UUID academyId, ScheduledTrainingRequest request) {
        var scope = permissions.resolve(actor, academyId);
        scope.requireManager();
        validateDetails(request);
        groups.requireVisible(scope, academyId, request.groupId());
        var coach = requireAssignedCoach(academyId, request.groupId(), request.coachUserId());
        if (trainings.existsByAcademyIdAndGroupIdAndTrainingDateAndStartTime(
                academyId, request.groupId(), request.trainingDate(), request.startTime())) {
            throw duplicateSlot();
        }
        var training = trainings.save(new ScheduledTraining(
                academyId, request.groupId(), coach, request.trainingDate(), request.startTime(),
                request.endTime(), request.location(), request.status(), clock.instant()));
        trainings.flush();
        return response(training);
    }

    @Transactional
    public ScheduledTrainingResponse update(UUID actor, UUID academyId, UUID trainingId,
            ScheduledTrainingUpdateRequest request) {
        var scope = permissions.resolve(actor, academyId);
        scope.requireManager();
        validateDetails(request.details());
        var training = find(academyId, trainingId);
        if (training.getVersion() != request.version()) {
            throw new BusinessException(ErrorCode.CONFLICT, "Training has changed; reload it before saving");
        }
        var details = request.details();
        groups.requireVisible(scope, academyId, details.groupId());
        var coach = requireAssignedCoach(academyId, details.groupId(), details.coachUserId());
        if (trainings.existsByAcademyIdAndGroupIdAndTrainingDateAndStartTimeAndIdNot(
                academyId, details.groupId(), details.trainingDate(), details.startTime(), trainingId)) {
            throw duplicateSlot();
        }
        training.update(details.groupId(), coach, details.trainingDate(), details.startTime(),
                details.endTime(), details.location(), details.status(), clock.instant());
        trainings.flush();
        return response(training);
    }

    @Transactional
    public void delete(UUID actor, UUID academyId, UUID trainingId) {
        permissions.resolve(actor, academyId).requireManager();
        trainings.delete(find(academyId, trainingId));
        trainings.flush();
    }

    public ScheduledTraining requireVisible(UUID actor, UUID academyId, UUID trainingId) {
        var scope = permissions.resolve(actor, academyId);
        scope.requireStaff();
        var training = find(academyId, trainingId);
        groups.requireVisible(scope, academyId, training.getGroupId());
        return training;
    }

    public void requireAttendanceAllowed(ScheduledTraining training) {
        if (training.getStatus() == TrainingStatus.CANCELLED) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Attendance cannot be recorded for a cancelled training");
        }
    }

    private ScheduledTraining find(UUID academyId, UUID trainingId) {
        return trainings.findByAcademyIdAndId(academyId, trainingId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Training not found"));
    }

    private AcademyMembership requireAssignedCoach(UUID academyId, UUID groupId, UUID coachUserId) {
        var membership = memberships.findByAcademyIdAndUserId(academyId, coachUserId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Coach not found in this academy"));
        if (!membership.isActive() || !membership.getRoles().contains(AcademyRole.COACH)
                || !groupCoaches.existsByAcademyIdAndGroupIdAndMembershipId(academyId, groupId, membership.getId())) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Coach must be assigned to the training group");
        }
        return membership;
    }

    private void validateDetails(ScheduledTrainingRequest request) {
        if (!request.endTime().isAfter(request.startTime())) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Training end time must be after start time");
        }
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (to.isBefore(from) || ChronoUnit.DAYS.between(from, to) > MAX_RANGE_DAYS) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Training date range must be between 0 and 92 days");
        }
    }

    private BusinessException duplicateSlot() {
        return new BusinessException(ErrorCode.CONFLICT, "The group already has a training at this time");
    }

    private ScheduledTrainingResponse response(ScheduledTraining training) {
        var group = trainingGroups.findByAcademyIdAndId(training.getAcademyId(), training.getGroupId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Group not found"));
        var coach = training.getCoach().getUser();
        return new ScheduledTrainingResponse(training.getId(), training.getAcademyId(), training.getGroupId(),
                group.getName(), coach.getId(), coach.getFullName(), training.getTrainingDate(),
                training.getStartTime(), training.getEndTime(), training.getLocation(), training.getStatus(),
                training.getVersion(), training.getCreatedAt(), training.getUpdatedAt());
    }
}
