package kz.jastalant.backend.auth.repository;

import jakarta.persistence.LockModeType;
import kz.jastalant.backend.auth.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.Repository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends Repository<PasswordResetToken, UUID> {
    PasswordResetToken save(PasswordResetToken token);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);
    @Modifying
    @Query("update PasswordResetToken t set t.usedAt = :now where t.user.id = :userId and t.usedAt is null")
    int invalidateAllByUserId(UUID userId, Instant now);
    boolean existsByUserIdAndCreatedAtAfter(UUID userId, Instant instant);
}
