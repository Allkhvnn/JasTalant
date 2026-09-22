package kz.jastalant.backend.auth.service;

import kz.jastalant.backend.auth.entity.PasswordResetToken;
import kz.jastalant.backend.auth.repository.PasswordResetTokenRepository;
import kz.jastalant.backend.common.exception.*;
import kz.jastalant.backend.common.service.TokenDigests;
import kz.jastalant.backend.user.entity.User;
import kz.jastalant.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordResetService {
    private final UserRepository users;
    private final PasswordResetTokenRepository resetTokens;
    private final RefreshSessionService sessions;
    private final PasswordEncoder passwords;
    private final PasswordResetMailer mailer;
    private final Clock clock;

    @Transactional
    public void request(String email) {
        users.findByEmail(User.normalizeEmail(email)).filter(User::isEmailVerified).ifPresent(user -> {
            var now = clock.instant();
            if (resetTokens.existsByUserIdAndCreatedAtAfter(user.getId(), now.minus(1, ChronoUnit.MINUTES))) return;
            resetTokens.invalidateAllByUserId(user.getId(), now);
            String raw = TokenDigests.generate();
            resetTokens.save(new PasswordResetToken(user, TokenDigests.hash(raw), now, now.plus(1, ChronoUnit.HOURS)));
            try {
                mailer.send(user.getEmail(), raw);
            } catch (MailException exception) {
                log.warn("Could not send password reset email", exception);
            }
        });
    }

    @Transactional
    public void reset(String rawToken, String newPassword) {
        var now = clock.instant();
        var token = resetTokens.findByTokenHash(TokenDigests.hash(rawToken)).orElseThrow(this::invalidToken);
        if (!token.isUsableAt(now)) throw invalidToken();
        token.use(now);
        token.getUser().changePasswordHash(passwords.encode(newPassword));
        resetTokens.invalidateAllByUserId(token.getUser().getId(), now);
        sessions.revokeAll(token.getUser().getId());
    }

    private BusinessException invalidToken() {
        return new BusinessException(ErrorCode.INVALID_REQUEST, "Invalid or expired password reset token");
    }
}
