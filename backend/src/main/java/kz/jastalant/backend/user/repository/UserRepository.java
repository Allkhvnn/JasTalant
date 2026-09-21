package kz.jastalant.backend.user.repository;

import kz.jastalant.backend.user.entity.PlatformRole;
import kz.jastalant.backend.user.entity.User;

import org.springframework.data.repository.Repository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends Repository<User, UUID> {
    User save(User user);
    Optional<User> findByEmail(String email);
    Optional<User> findById(UUID id);
    boolean existsByPlatformRole(PlatformRole role);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> lockById(UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<User> findByVerificationTokenHash(String hash);
}
