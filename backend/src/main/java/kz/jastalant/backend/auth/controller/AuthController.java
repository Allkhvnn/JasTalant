package kz.jastalant.backend.auth.controller;

import kz.jastalant.backend.auth.dto.*;

import kz.jastalant.backend.auth.service.AuthService;
import kz.jastalant.backend.auth.service.PasswordResetService;
import kz.jastalant.backend.auth.service.RefreshCookieService;
import kz.jastalant.backend.auth.service.RefreshSessionService;
import kz.jastalant.backend.membership.dto.AcademyMembershipView;
import kz.jastalant.backend.membership.service.MembershipService;
import kz.jastalant.backend.onboarding.dto.ApplicationView;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
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
    private final RefreshSessionService sessions;
    private final RefreshCookieService cookies;
    private final PasswordResetService passwordReset;

    @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED)
    public ApplicationView register(@Valid @RequestBody RegisterRequest request) { return auth.register(request); }

    @PostMapping("/login")
    public ResponseEntity<AccessTokenResponse> login(@Valid @RequestBody LoginRequest request) {
        return sessionResponse(auth.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AccessTokenResponse> refresh(
            @CookieValue(name = RefreshCookieService.NAME, required = false) String refreshToken) {
        return sessionResponse(sessions.rotate(refreshToken));
    }

    @PostMapping("/logout") @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> logout(
            @CookieValue(name = RefreshCookieService.NAME, required = false) String refreshToken) {
        sessions.revoke(refreshToken);
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookies.clear()).build();
    }

    @PostMapping("/forgot-password") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordReset.request(request.email());
    }

    @PostMapping("/reset-password") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordReset.reset(request.token(), request.password());
    }

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

    private ResponseEntity<AccessTokenResponse> sessionResponse(RefreshSessionService.Session session) {
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookies.create(session.refreshToken()))
                .body(session.access());
    }
}
