package kz.jastalant.backend.membership.service;

import kz.jastalant.backend.academy.service.AcademyPermissionService;
import kz.jastalant.backend.membership.dto.AcademyMemberView;
import kz.jastalant.backend.membership.dto.AcademyMembershipView;
import kz.jastalant.backend.membership.entity.AcademyRole;
import kz.jastalant.backend.membership.mapper.AcademyMembershipMapper;
import kz.jastalant.backend.membership.repository.AcademyMembershipRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MembershipService {
    private final AcademyMembershipRepository memberships;
    private final AcademyPermissionService permissions;

    @Transactional(readOnly = true)
    public List<AcademyMembershipView> mine(UUID userId) {
        return memberships.findAllByUserIdWithAcademy(userId).stream()
                .map(AcademyMembershipMapper::toView)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AcademyMemberView> academyMembers(UUID actor, UUID academyId, AcademyRole role) {
        permissions.resolve(actor, academyId).requireManager();
        return memberships.findAllByAcademyIdAndRoleWithUser(academyId, role).stream()
                .map(AcademyMembershipMapper::toMemberView)
                .toList();
    }
}
