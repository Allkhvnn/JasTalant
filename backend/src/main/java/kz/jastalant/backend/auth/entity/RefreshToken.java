package kz.jastalant.backend.auth.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import kz.jastalant.backend.user.entity.User;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "auth_refresh_tokens")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RefreshToken {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private User user;
    @Column(name = "token_hash", nullable = false, unique = true, length = 64) private String tokenHash;
    @Column(name = "expires_at", nullable = false) private Instant expiresAt;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "revoked_at") private Instant revokedAt;

    public RefreshToken(User user, String tokenHash, Instant createdAt, Instant expiresAt) {
        this.user = user; this.tokenHash = tokenHash; this.createdAt = createdAt; this.expiresAt = expiresAt;
    }
    public boolean isUsableAt(Instant instant) { return revokedAt == null && expiresAt.isAfter(instant); }
    public void revoke(Instant instant) { if (revokedAt == null) revokedAt = instant; }
}
