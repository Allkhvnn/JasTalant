package kz.jastalant.backend.invitation.controller;

import jakarta.validation.Valid;
import kz.jastalant.backend.common.dto.PageResponse;
import kz.jastalant.backend.invitation.dto.*;
import kz.jastalant.backend.invitation.service.InvitationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class InvitationController {
    private final InvitationService invitations;

    @PostMapping("/api/academies/{academyId}/invitations")
    @ResponseStatus(HttpStatus.CREATED)
    public InvitationResponse create(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId,
                                     @Valid @RequestBody CreateInvitationRequest request) {
        return invitations.create(UUID.fromString(jwt.getSubject()), academyId, request);
    }

    @GetMapping("/api/academies/{academyId}/invitations")
    public PageResponse<InvitationResponse> list(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return invitations.list(UUID.fromString(jwt.getSubject()), academyId, page, size);
    }

    @DeleteMapping("/api/academies/{academyId}/invitations/{id}")
    public InvitationResponse revoke(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID academyId,
                                     @PathVariable UUID id) {
        return invitations.revoke(UUID.fromString(jwt.getSubject()), academyId, id);
    }

    @PostMapping("/api/invitations/preview")
    public InvitationPreviewResponse preview(@Valid @RequestBody InvitationTokenRequest request) {
        return invitations.preview(request.token());
    }

    @PostMapping("/api/invitations/accept")
    public AcceptedMembershipResponse accept(@AuthenticationPrincipal Jwt jwt,
                                             @Valid @RequestBody InvitationTokenRequest request) {
        return invitations.acceptExisting(UUID.fromString(jwt.getSubject()), request.token());
    }

    @PostMapping("/api/invitations/accept-new")
    public AcceptedMembershipResponse acceptNew(@Valid @RequestBody AcceptNewUserRequest request) {
        return invitations.acceptNew(request);
    }
}
