package kz.jastalant.backend.membership.mapper;

import kz.jastalant.backend.membership.dto.AcademyMembershipView;
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
}
