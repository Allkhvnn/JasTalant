package kz.jastalant.backend.membership.dto;

import kz.jastalant.backend.membership.entity.AcademyRole;

import java.util.Set;
import java.util.UUID;

public record AcademyMembershipView(UUID academyId, String academyName, Set<AcademyRole> roles) {}
