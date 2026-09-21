package kz.jastalant.backend.user.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(name = "app_users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank
    @Email
    @Size(max = 254)
    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @NotBlank
    @Size(max = 200)
    @Column(nullable = false, length = 200)
    private String fullName;

    @JsonIgnore
    @NotBlank
    @Size(max = 255)
    @Column(nullable = false)
    private String passwordHash;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PlatformRole platformRole = PlatformRole.USER;

    @Column(nullable = false)
    private boolean emailVerified;

    @JsonIgnore
    @Column(length = 64, unique = true)
    private String verificationTokenHash;

    @JsonIgnore
    private Instant verificationExpiresAt;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    /** Accepts an already encoded password; hashing belongs to the authentication service. */
    public User(String email, String fullName, String passwordHash) {
        this.email = normalizeEmail(email);
        this.fullName = fullName == null ? null : fullName.strip();
        this.passwordHash = passwordHash;
    }

    public static String normalizeEmail(String email) {
        return email == null ? null : email.strip().toLowerCase(Locale.ROOT);
    }

    public void issueVerification(String hash, Instant expiresAt) {
        this.verificationTokenHash = hash;
        this.verificationExpiresAt = expiresAt;
    }

    public void confirmEmail() {
        this.emailVerified = true;
        this.verificationTokenHash = null;
        this.verificationExpiresAt = null;
    }

    /** Only used by the offline owner bootstrap, never by public registration. */
    public static User platformOwner(String email, String fullName, String encodedPassword) {
        User user = new User(email, fullName, encodedPassword);
        user.platformRole = PlatformRole.SUPER_ADMIN;
        user.confirmEmail();
        return user;
    }
}
