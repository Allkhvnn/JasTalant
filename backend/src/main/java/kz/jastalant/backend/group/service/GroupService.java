package kz.jastalant.backend.group.service;

import kz.jastalant.backend.academy.service.AcademyPermissionService;
import kz.jastalant.backend.academy.service.AcademyPermissionService.Scope;
import kz.jastalant.backend.common.dto.PageResponse;
import kz.jastalant.backend.common.exception.*;
import kz.jastalant.backend.common.service.PageRequests;
import kz.jastalant.backend.group.dto.*;
import kz.jastalant.backend.group.entity.*;
import kz.jastalant.backend.group.mapper.GroupMapper;
import kz.jastalant.backend.group.repository.*;
import kz.jastalant.backend.membership.entity.AcademyRole;
import kz.jastalant.backend.membership.repository.AcademyMembershipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GroupService {
    private final TrainingGroupRepository groups;
    private final GroupCoachRepository coaches;
    private final AcademyMembershipRepository memberships;
    private final AcademyPermissionService permissions;

    public PageResponse<GroupResponse> list(UUID actor, UUID academyId, int page, int size) {
        var scope = permissions.resolve(actor, academyId);
        scope.requireStaff();
        var pageable = PageRequests.of(page, size);
        var result = scope.manager() ? groups.findAllByAcademyId(academyId, pageable)
                : groups.findAssigned(academyId, scope.membershipId(), pageable);
        return new PageResponse<>(result.map(GroupMapper::toResponse).getContent(), page, size, result.getTotalElements());
    }

    public GroupResponse get(UUID actor, UUID academyId, UUID id) {
        return GroupMapper.toResponse(requireVisible(permissions.resolve(actor, academyId), academyId, id));
    }

    @Transactional
    public GroupResponse create(UUID actor, UUID academyId, GroupRequest request) {
        permissions.resolve(actor, academyId).requireManager();
        var group = groups.save(new TrainingGroup(academyId, request.name(), request.ageCategory()));
        groups.flush();
        return GroupMapper.toResponse(group);
    }

    @Transactional
    public GroupResponse update(UUID actor, UUID academyId, UUID id, GroupUpdateRequest request) {
        permissions.resolve(actor, academyId).requireManager();
        var group = find(academyId, id);
        if (group.getVersion() != request.version()) throw new BusinessException(ErrorCode.CONFLICT, "Group has changed; reload it");
        group.update(request.details().name(), request.details().ageCategory());
        groups.flush();
        return GroupMapper.toResponse(group);
    }

    @Transactional
    public void delete(UUID actor, UUID academyId, UUID id) {
        permissions.resolve(actor, academyId).requireManager();
        groups.delete(find(academyId, id));
        groups.flush();
    }

    public List<CoachResponse> coaches(UUID actor, UUID academyId, UUID groupId) {
        requireVisible(permissions.resolve(actor, academyId), academyId, groupId);
        return coaches.findAllByAcademyIdAndGroupIdOrderById(academyId, groupId).stream().map(GroupMapper::toCoach).toList();
    }

    @Transactional
    public void assignCoach(UUID actor, UUID academyId, UUID groupId, UUID userId) {
        permissions.resolve(actor, academyId).requireManager();
        find(academyId, groupId);
        var membership = memberships.findByAcademyIdAndUserId(academyId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Coach not found in this academy"));
        if (!membership.isActive() || !membership.getRoles().contains(AcademyRole.COACH)) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "The member must have the COACH role");
        }
        if (!coaches.existsByAcademyIdAndGroupIdAndMembershipId(academyId, groupId, membership.getId())) {
            coaches.save(new GroupCoach(academyId, groupId, membership));
            coaches.flush();
        }
    }

    @Transactional
    public void unassignCoach(UUID actor, UUID academyId, UUID groupId, UUID userId) {
        permissions.resolve(actor, academyId).requireManager();
        find(academyId, groupId);
        memberships.findByAcademyIdAndUserId(academyId, userId).ifPresent(membership ->
                coaches.findByAcademyIdAndGroupIdAndMembershipId(academyId, groupId, membership.getId()).ifPresent(coaches::delete));
    }

    /** Shared by player operations inside their transaction, using a server-resolved scope. */
    public TrainingGroup requireVisible(Scope scope, UUID academyId, UUID groupId) {
        scope.requireStaff();
        var group = find(academyId, groupId);
        if (!scope.manager() && !coaches.existsByAcademyIdAndGroupIdAndMembershipId(academyId, groupId, scope.membershipId())) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "Group not found");
        }
        return group;
    }

    private TrainingGroup find(UUID academyId, UUID id) {
        return groups.findByAcademyIdAndId(academyId, id)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Group not found"));
    }
}
