package kz.jastalant.backend.membership.mapper;

import kz.jastalant.backend.membership.dto.AcademyMembershipView;
import kz.jastalant.backend.membership.dto.AcademyMemberView;
import kz.jastalant.backend.membership.entity.AcademyMembership;

import java.util.Set;

public final class AcademyMembershipMapper {
    private AcademyMembershipMapper() {}

    public static AcademyMembershipView toView(AcademyMembership membership) {
        return new AcademyMembershipView(
                membership.getAcademy().getId(),
                membership.getAcademy().getName(),
                Set.copyOf(membership.getRoles())
        );
    }

    public static AcademyMemberView toMemberView(AcademyMembership membership) {
        var user = membership.getUser();
        return new AcademyMemberView(
                membership.getId(),
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                Set.copyOf(membership.getRoles()),
                membership.isActive(),
                membership.getVersion(),
                membership.getCreatedAt()
        );
    }
}
