package kz.jastalant.backend.parent.entity;

import jakarta.persistence.*;
import kz.jastalant.backend.membership.entity.AcademyMembership;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "parent_players", uniqueConstraints =
        @UniqueConstraint(name = "uq_parent_player", columnNames = {"parent_membership_id", "player_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ParentPlayer {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, updatable = false)
    private UUID academyId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "parent_membership_id", nullable = false, updatable = false)
    private AcademyMembership membership;

    @Column(nullable = false, updatable = false)
    private UUID playerId;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public ParentPlayer(UUID academyId, AcademyMembership membership, UUID playerId) {
        this.academyId = academyId;
        this.membership = membership;
        this.playerId = playerId;
    }
}
