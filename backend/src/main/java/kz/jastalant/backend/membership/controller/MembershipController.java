package kz.jastalant.backend.membership.controller;

import kz.jastalant.backend.membership.dto.AcademyMemberView;
import kz.jastalant.backend.membership.entity.AcademyRole;
import kz.jastalant.backend.membership.service.MembershipService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/academies/{academyId}/members")
@RequiredArgsConstructor
public class MembershipController {
    private final MembershipService memberships;

    @GetMapping
    public List<AcademyMemberView> list(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID academyId,
            @RequestParam AcademyRole role) {
        return memberships.academyMembers(UUID.fromString(jwt.getSubject()), academyId, role);
    }
}
