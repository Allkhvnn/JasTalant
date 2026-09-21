package kz.jastalant.backend.membership.entity;

import kz.jastalant.backend.academy.entity.Academy;
import kz.jastalant.backend.user.entity.User;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotEmpty;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;
import java.util.Set;
import java.util.HashSet;
import java.util.Collections;
import java.util.Objects;

@Entity
@Table(name = "academy_memberships", uniqueConstraints =
        @UniqueConstraint(name = "uq_membership_academy_user", columnNames = {"academy_id", "user_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AcademyMembership {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "academy_id", nullable = false, updatable = false)
    private Academy academy;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, updatable = false)
    private User user;

    @NotEmpty
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "academy_membership_roles", joinColumns = @JoinColumn(name = "membership_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private Set<@NotNull AcademyRole> roles = new HashSet<>();

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public AcademyMembership(Academy academy, User user, AcademyRole... roles) {
        this.academy = academy;
        this.user = user;
        Objects.requireNonNull(roles, "Roles must not be null");
        if (roles.length == 0) {
            throw new IllegalArgumentException("At least one academy role is required");
        }
        for (AcademyRole role : roles) {
            this.roles.add(Objects.requireNonNull(role, "Role must not be null"));
        }
    }

    public Set<AcademyRole> getRoles() {
        return Collections.unmodifiableSet(roles);
    }

    public void addRoles(Set<AcademyRole> additionalRoles) {
        if (additionalRoles == null || additionalRoles.isEmpty()) {
            throw new IllegalArgumentException("At least one academy role is required");
        }
        additionalRoles.forEach(role -> roles.add(Objects.requireNonNull(role, "Role must not be null")));
    }
}
