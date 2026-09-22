package kz.jastalant.backend.membership.service;

import kz.jastalant.backend.academy.service.AcademyPermissionService;
import kz.jastalant.backend.academy.repository.AcademyRepository;
import kz.jastalant.backend.common.exception.BusinessException;
import kz.jastalant.backend.common.exception.ErrorCode;
import kz.jastalant.backend.membership.dto.AcademyMemberView;
import kz.jastalant.backend.membership.dto.AcademyMemberUpdateRequest;
import kz.jastalant.backend.membership.dto.AcademyMembershipView;
import kz.jastalant.backend.membership.entity.AcademyRole;
import kz.jastalant.backend.membership.mapper.AcademyMembershipMapper;
import kz.jastalant.backend.membership.repository.AcademyMembershipRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MembershipService {
    private final AcademyMembershipRepository memberships;
    private final AcademyPermissionService permissions;
    private final AcademyRepository academies;

    @Transactional(readOnly = true)
    public List<AcademyMembershipView> mine(UUID userId) {
        return memberships.findAllByUserIdWithAcademy(userId).stream()
                .map(AcademyMembershipMapper::toView)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AcademyMemberView> academyMembers(UUID actor, UUID academyId, AcademyRole role) {
        permissions.resolve(actor, academyId).requireManager();
        var result = role == null
                ? memberships.findAllByAcademyIdWithUserAndRoles(academyId)
                : memberships.findAllByAcademyIdAndRoleWithUser(academyId, role);
        return result.stream()
                .map(AcademyMembershipMapper::toMemberView)
                .toList();
    }

    @Transactional
    public AcademyMemberView update(UUID actor, UUID academyId, UUID userId,
            AcademyMemberUpdateRequest request) {
        permissions.resolve(actor, academyId).requireManager();
        academies.lockById(academyId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Academy not found"));
        var membership = memberships.findByAcademyIdAndUserId(academyId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Academy member not found"));
        if (membership.getVersion() != request.version()) {
            throw new BusinessException(ErrorCode.CONFLICT, "Academy member has changed; reload it before saving");
        }
        boolean removesActiveAdmin = membership.isActive()
                && membership.getRoles().contains(AcademyRole.ADMIN)
                && (!request.active() || !request.roles().contains(AcademyRole.ADMIN));
        if (removesActiveAdmin
                && memberships.countActiveByAcademyIdAndRole(academyId, AcademyRole.ADMIN) <= 1) {
            throw new BusinessException(ErrorCode.CONFLICT, "The academy must have at least one active administrator");
        }
        membership.update(Set.copyOf(request.roles()), request.active());
        memberships.flush();
        return AcademyMembershipMapper.toMemberView(membership);
    }
}
