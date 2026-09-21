package kz.jastalant.backend.auth.controller;

import kz.jastalant.backend.auth.dto.AccessTokenResponse;
import kz.jastalant.backend.auth.dto.AccountResponse;
import kz.jastalant.backend.auth.dto.LoginRequest;
import kz.jastalant.backend.auth.dto.RegisterRequest;
import kz.jastalant.backend.auth.dto.VerifyEmailRequest;

import kz.jastalant.backend.auth.service.AuthService;
import kz.jastalant.backend.membership.dto.AcademyMembershipView;
import kz.jastalant.backend.membership.service.MembershipService;
import kz.jastalant.backend.onboarding.dto.ApplicationView;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService auth;
    private final MembershipService memberships;

    @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED)
    public ApplicationView register(@Valid @RequestBody RegisterRequest request) { return auth.register(request); }

    @PostMapping("/login")
    public AccessTokenResponse login(@Valid @RequestBody LoginRequest request) { return auth.login(request); }

    @PostMapping("/verify-email") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void verify(@Valid @RequestBody VerifyEmailRequest request) { auth.verify(request.token()); }

    @PostMapping("/resend-verification") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resend(@AuthenticationPrincipal Jwt jwt) { auth.resend(UUID.fromString(jwt.getSubject())); }

    @GetMapping("/me")
    public AccountResponse me(@AuthenticationPrincipal Jwt jwt) { return auth.account(UUID.fromString(jwt.getSubject())); }

    @GetMapping("/academies")
    public List<AcademyMembershipView> academies(@AuthenticationPrincipal Jwt jwt) {
        return memberships.mine(UUID.fromString(jwt.getSubject()));
    }
}
