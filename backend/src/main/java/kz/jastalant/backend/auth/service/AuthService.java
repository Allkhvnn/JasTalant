package kz.jastalant.backend.auth.service;

import kz.jastalant.backend.auth.dto.AccessTokenResponse;
import kz.jastalant.backend.auth.dto.AccountResponse;
import kz.jastalant.backend.auth.dto.LoginRequest;
import kz.jastalant.backend.auth.dto.RegisterRequest;

import kz.jastalant.backend.onboarding.dto.ApplicationView;
import kz.jastalant.backend.onboarding.mapper.ApplicationMapper;
import kz.jastalant.backend.onboarding.entity.AcademyApplication;
import kz.jastalant.backend.onboarding.repository.AcademyApplicationRepository;
import kz.jastalant.backend.security.JwtService;
import kz.jastalant.backend.user.entity.User;
import kz.jastalant.backend.user.repository.UserRepository;

import kz.jastalant.backend.common.exception.ErrorCode;
import kz.jastalant.backend.common.service.TokenDigests;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import kz.jastalant.backend.common.exception.BusinessException;
import java.time.Clock;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
public class AuthService {
    private final UserRepository users;
    private final AcademyApplicationRepository applications;
    private final PasswordEncoder passwords;
    private final JwtService jwt;
    private final VerificationMailer mailer;
    private final Clock clock;
    private final String dummyHash;

    public AuthService(UserRepository users, AcademyApplicationRepository applications, PasswordEncoder passwords,
                       JwtService jwt, VerificationMailer mailer, Clock clock) {
        this.users = users;
        this.applications = applications;
        this.passwords = passwords;
        this.jwt = jwt;
        this.mailer = mailer;
        this.clock = clock;
        this.dummyHash = passwords.encode(UUID.randomUUID().toString());
    }

    @Transactional
    public ApplicationView register(RegisterRequest request) {
        String email = User.normalizeEmail(request.email());
        if (users.findByEmail(email).isPresent()) throw new BusinessException(ErrorCode.CONFLICT, "Email is already registered");
        var user = users.save(new User(email, request.fullName(), passwords.encode(request.password())));
        var application = applications.save(new AcademyApplication(user, request.academyName()));
        sendVerification(user);
        return ApplicationMapper.toView(application);
    }

    @Transactional(readOnly = true)
    public AccessTokenResponse login(LoginRequest request) {
        var user = users.findByEmail(User.normalizeEmail(request.email()));
        boolean matches = passwords.matches(request.password(), user.map(User::getPasswordHash).orElse(dummyHash));
        if (user.isEmpty() || !matches) throw new BusinessException(ErrorCode.UNAUTHENTICATED, "Invalid email or password");
        return jwt.issue(user.orElseThrow().getId());
    }

    @Transactional
    public void verify(String token) {
        var user = users.findByVerificationTokenHash(TokenDigests.hash(token))
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_REQUEST, "Invalid or expired verification code"));
        if (!user.getVerificationExpiresAt().isAfter(clock.instant())) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Invalid or expired verification code");
        }
        user.confirmEmail();
        applications.findByApplicantId(user.getId()).ifPresent(AcademyApplication::emailConfirmed);
    }

    @Transactional
    public void resend(UUID userId) {
        var user = users.lockById(userId).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHENTICATED));
        if (user.isEmailVerified()) throw new BusinessException(ErrorCode.CONFLICT, "Email is already verified");
        if (user.getVerificationExpiresAt() != null
                && user.getVerificationExpiresAt().minus(24, ChronoUnit.HOURS).isAfter(clock.instant().minusSeconds(60))) {
            throw new BusinessException(ErrorCode.RATE_LIMITED, "Wait one minute before requesting another code");
        }
        sendVerification(user);
    }

    @Transactional(readOnly = true)
    public AccountResponse account(UUID id) {
        var user = users.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHENTICATED));
        return kz.jastalant.backend.auth.mapper.AuthMapper.toAccount(user);
    }

    private void sendVerification(User user) {
        String token = TokenDigests.generate();
        user.issueVerification(TokenDigests.hash(token), clock.instant().plus(24, ChronoUnit.HOURS));
        mailer.send(user.getEmail(), token);
    }
}
