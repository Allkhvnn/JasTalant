package kz.jastalant.backend.academy.service;

import kz.jastalant.backend.academy.entity.Academy;
import kz.jastalant.backend.academy.repository.AcademyRepository;
import kz.jastalant.backend.membership.entity.AcademyRole;
import kz.jastalant.backend.membership.repository.AcademyMembershipRepository;
import kz.jastalant.backend.user.entity.PlatformRole;
import kz.jastalant.backend.user.entity.User;
import kz.jastalant.backend.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import kz.jastalant.backend.common.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import kz.jastalant.backend.common.exception.BusinessException;
import java.util.UUID;

/** Resolves current permissions from the database; caller-supplied academy IDs never grant access. */
@Service
@RequiredArgsConstructor
public class AcademyPermissionService {
    private final UserRepository users;
    private final AcademyRepository academies;
    private final AcademyMembershipRepository memberships;

    public record Scope(boolean owner, UUID membershipId, java.util.Set<AcademyRole> roles) {
        public boolean manager() { return owner || roles.contains(AcademyRole.ADMIN); }

        public void requireStaff() {
            if (!manager() && !roles.contains(AcademyRole.COACH)) {
                throw new BusinessException(ErrorCode.FORBIDDEN, "Staff access required");
            }
        }

        public void requireManager() {
            if (!manager()) throw new BusinessException(ErrorCode.FORBIDDEN, "Academy administrator required");
        }
    }

    @Transactional(readOnly = true)
    public Scope resolve(UUID actor, UUID academyId) {
        var user = users.findById(actor).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHENTICATED));
        if (!user.isEmailVerified()) throw new BusinessException(ErrorCode.FORBIDDEN, "Email must be verified");
        if (user.getPlatformRole() == PlatformRole.SUPER_ADMIN) {
            academies.findById(academyId).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
            return new Scope(true, null, java.util.Set.of());
        }
        var membership = memberships.findByAcademyIdAndUserId(academyId, actor)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Academy not found"));
        return new Scope(false, membership.getId(), java.util.Set.copyOf(membership.getRoles()));
    }
}
