package kz.jastalant.backend.academy.mapper;

import kz.jastalant.backend.academy.dto.AcademyView;
import kz.jastalant.backend.academy.entity.Academy;
import kz.jastalant.backend.membership.entity.AcademyRole;
import java.util.Set;

public final class AcademyMapper {
    private AcademyMapper() {}

    public static AcademyView toView(Academy academy, Set<AcademyRole> roles) {
        return new AcademyView(academy.getId(), academy.getName(), Set.copyOf(roles));
    }
}
