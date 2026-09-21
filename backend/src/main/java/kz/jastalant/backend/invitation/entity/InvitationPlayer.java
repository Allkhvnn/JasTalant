package kz.jastalant.backend.invitation.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "academy_invitation_players", uniqueConstraints =
        @UniqueConstraint(name = "uq_invitation_player", columnNames = {"invitation_id", "player_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InvitationPlayer {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "invitation_id", nullable = false, updatable = false)
    private AcademyInvitation invitation;

    @Column(nullable = false, updatable = false)
    private UUID academyId;

    @Column(nullable = false, updatable = false)
    private UUID playerId;

    InvitationPlayer(AcademyInvitation invitation, UUID academyId, UUID playerId) {
        this.invitation = invitation;
        this.academyId = academyId;
        this.playerId = playerId;
    }
}
