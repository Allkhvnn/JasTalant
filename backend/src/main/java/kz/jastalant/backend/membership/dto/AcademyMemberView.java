package kz.jastalant.backend.membership.dto;

import kz.jastalant.backend.membership.entity.AcademyRole;

import java.util.Set;
import java.util.UUID;

public record AcademyMemberView(UUID userId, String fullName, String email, Set<AcademyRole> roles) {}
