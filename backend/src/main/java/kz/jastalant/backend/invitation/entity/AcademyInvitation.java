package kz.jastalant.backend.invitation.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import kz.jastalant.backend.membership.entity.AcademyRole;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.*;

@Entity
@Table(name = "academy_invitations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AcademyInvitation {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, updatable = false)
    private UUID academyId;

    @Column(nullable = false, length = 254, updatable = false)
    private String email;

    @Column(nullable = false, unique = true, length = 64, updatable = false)
    private String tokenHash;

    @NotEmpty
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "academy_invitation_roles", joinColumns = @JoinColumn(name = "invitation_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private Set<@NotNull AcademyRole> roles = new HashSet<>();

    @OneToMany(mappedBy = "invitation", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<InvitationPlayer> players = new HashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InvitationStatus status = InvitationStatus.PENDING;

    @Column(nullable = false, updatable = false)
    private Instant expiresAt;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false, updatable = false)
    private UUID createdBy;

    private Instant acceptedAt;
    private UUID acceptedBy;

    public AcademyInvitation(UUID academyId, String email, String tokenHash, Set<AcademyRole> roles,
                             Set<UUID> playerIds, Instant expiresAt, Instant createdAt, UUID createdBy) {
        this.academyId = academyId;
        this.email = email;
        this.tokenHash = tokenHash;
        this.roles.addAll(roles);
        playerIds.forEach(playerId -> players.add(new InvitationPlayer(this, academyId, playerId)));
        this.expiresAt = expiresAt;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
    }

    public Set<AcademyRole> getRoles() {
        return Collections.unmodifiableSet(roles);
    }

    public Set<UUID> getPlayerIds() {
        return players.stream().map(InvitationPlayer::getPlayerId)
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
    }

    public boolean isExpired(Instant now) {
        return !expiresAt.isAfter(now);
    }

    public void accept(UUID userId, Instant now) {
        requirePending();
        status = InvitationStatus.ACCEPTED;
        acceptedBy = userId;
        acceptedAt = now;
    }

    public void revoke() {
        requirePending();
        status = InvitationStatus.REVOKED;
    }

    private void requirePending() {
        if (status != InvitationStatus.PENDING) {
            throw new IllegalStateException("Invitation is not pending");
        }
    }
}
