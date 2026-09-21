package kz.jastalant.backend.group.entity;

import kz.jastalant.backend.membership.entity.AcademyMembership;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Entity
@Table(name = "group_coaches")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GroupCoach {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false, updatable = false)
    private UUID academyId;
    @Column(nullable = false, updatable = false)
    private UUID groupId;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "membership_id", nullable = false, updatable = false)
    private AcademyMembership membership;

    public GroupCoach(UUID academyId, UUID groupId, AcademyMembership membership) {
        this.academyId = academyId;
        this.groupId = groupId;
        this.membership = membership;
    }
}
