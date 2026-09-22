package kz.jastalant.backend.auth.repository;

import jakarta.persistence.LockModeType;
import kz.jastalant.backend.auth.entity.RefreshToken;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.Repository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends Repository<RefreshToken, UUID> {
    RefreshToken save(RefreshToken token);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<RefreshToken> findByTokenHash(String tokenHash);
    @Modifying
    @Query("update RefreshToken t set t.revokedAt = :now where t.user.id = :userId and t.revokedAt is null")
    int revokeAllByUserId(UUID userId, Instant now);
}
