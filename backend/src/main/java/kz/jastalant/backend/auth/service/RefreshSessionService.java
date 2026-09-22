package kz.jastalant.backend.auth.service;

import kz.jastalant.backend.auth.dto.AccessTokenResponse;
import kz.jastalant.backend.auth.entity.RefreshToken;
import kz.jastalant.backend.auth.repository.RefreshTokenRepository;
import kz.jastalant.backend.common.exception.*;
import kz.jastalant.backend.common.service.TokenDigests;
import kz.jastalant.backend.security.JwtService;
import kz.jastalant.backend.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshSessionService {
    public record Session(AccessTokenResponse access, String refreshToken) {}
    private final RefreshTokenRepository tokens;
    private final JwtService jwt;
    private final Clock clock;
    @Value("${app.auth.refresh-days:30}") private long refreshDays;

    @Transactional public Session create(User user) { return issue(user); }

    @Transactional
    public Session rotate(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) throw invalidSession();
        var now = clock.instant();
        var current = tokens.findByTokenHash(TokenDigests.hash(rawToken)).orElseThrow(this::invalidSession);
        if (!current.isUsableAt(now)) throw invalidSession();
        current.revoke(now);
        return issue(current.getUser());
    }

    @Transactional
    public void revoke(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return;
        tokens.findByTokenHash(TokenDigests.hash(rawToken)).ifPresent(token -> token.revoke(clock.instant()));
    }

    @Transactional public void revokeAll(UUID userId) { tokens.revokeAllByUserId(userId, clock.instant()); }

    private Session issue(User user) {
        var now = clock.instant();
        String raw = TokenDigests.generate();
        tokens.save(new RefreshToken(user, TokenDigests.hash(raw), now, now.plus(refreshDays, ChronoUnit.DAYS)));
        return new Session(jwt.issue(user.getId()), raw);
    }

    private BusinessException invalidSession() {
        return new BusinessException(ErrorCode.UNAUTHENTICATED, "Invalid or expired session");
    }
}
