package kz.jastalant.backend.academy.dto;

import kz.jastalant.backend.membership.entity.AcademyRole;
import java.util.Set;
import java.util.UUID;

public record AcademyView(UUID id, String name, Set<AcademyRole> roles) {}
