package kz.jastalant.backend.development.entity;

import jakarta.persistence.*;
import kz.jastalant.backend.user.entity.User;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "player_development_assessments", uniqueConstraints = @UniqueConstraint(
        name = "uq_player_development_assessment_date",
        columnNames = {"academy_id", "player_id", "assessment_date"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlayerDevelopmentAssessment {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false, updatable = false)
    private UUID academyId;
    @Column(nullable = false, updatable = false)
    private UUID playerId;
    @Column(nullable = false)
    private LocalDate assessmentDate;
    @Column(nullable = false, precision = 3, scale = 1)
    private BigDecimal technique;
    @Column(nullable = false, precision = 3, scale = 1)
    private BigDecimal speed;
    @Column(nullable = false, precision = 3, scale = 1)
    private BigDecimal endurance;
    @Column(nullable = false, precision = 3, scale = 1)
    private BigDecimal physicalFitness;
    @Column(nullable = false, precision = 3, scale = 1)
    private BigDecimal gameIntelligence;
    @Column(length = 500)
    private String comment;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_user_id", nullable = false, updatable = false)
    private User createdBy;
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
    @Column(nullable = false)
    private Instant updatedAt;
    @Version
    private long version;

    public PlayerDevelopmentAssessment(UUID academyId, UUID playerId, LocalDate assessmentDate,
            BigDecimal technique, BigDecimal speed, BigDecimal endurance, BigDecimal physicalFitness,
            BigDecimal gameIntelligence, String comment, User createdBy, Instant now) {
        this.academyId = academyId;
        this.playerId = playerId;
        this.createdBy = createdBy;
        this.createdAt = now;
        update(assessmentDate, technique, speed, endurance, physicalFitness, gameIntelligence, comment, now);
    }

    public void update(LocalDate assessmentDate, BigDecimal technique, BigDecimal speed,
            BigDecimal endurance, BigDecimal physicalFitness, BigDecimal gameIntelligence,
            String comment, Instant now) {
        this.assessmentDate = assessmentDate;
        this.technique = technique;
        this.speed = speed;
        this.endurance = endurance;
        this.physicalFitness = physicalFitness;
        this.gameIntelligence = gameIntelligence;
        this.comment = comment == null || comment.isBlank() ? null : comment.strip();
        this.updatedAt = now;
    }
}
