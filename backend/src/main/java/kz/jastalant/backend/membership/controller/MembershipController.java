package kz.jastalant.backend.membership.controller;

import kz.jastalant.backend.membership.dto.AcademyMemberView;
import kz.jastalant.backend.membership.dto.AcademyMemberUpdateRequest;
import kz.jastalant.backend.membership.entity.AcademyRole;
import kz.jastalant.backend.membership.service.MembershipService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.*;

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
            @RequestParam(required = false) AcademyRole role) {
        return memberships.academyMembers(UUID.fromString(jwt.getSubject()), academyId, role);
    }

    @PutMapping("/{userId}")
    public AcademyMemberView update(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID academyId,
            @PathVariable UUID userId,
            @Valid @RequestBody AcademyMemberUpdateRequest request) {
        return memberships.update(UUID.fromString(jwt.getSubject()), academyId, userId, request);
    }

    @GetMapping("/{userId}/avatar")
    public ResponseEntity<byte[]> avatar(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId,
            @PathVariable UUID userId) {
        var avatar = memberships.avatar(UUID.fromString(jwt.getSubject()), academyId, userId);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(avatar.contentType()))
                .cacheControl(CacheControl.noCache()).eTag("\"" + avatar.version() + "\"").body(avatar.bytes());
    }

    @PutMapping(path = "/{userId}/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AcademyMemberView updateAvatar(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId,
            @PathVariable UUID userId, @RequestParam long version, @RequestPart("file") MultipartFile file) {
        return memberships.updateAvatar(UUID.fromString(jwt.getSubject()), academyId, userId, version, file);
    }

    @DeleteMapping("/{userId}/avatar")
    public AcademyMemberView removeAvatar(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId,
            @PathVariable UUID userId, @RequestParam long version) {
        return memberships.removeAvatar(UUID.fromString(jwt.getSubject()), academyId, userId, version);
    }
}
