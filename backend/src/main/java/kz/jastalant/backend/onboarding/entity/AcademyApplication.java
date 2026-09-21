package kz.jastalant.backend.onboarding.entity;

import kz.jastalant.backend.user.entity.User;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "academy_applications")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AcademyApplication {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "applicant_id", nullable = false, unique = true, updatable = false)
    private User applicant;
    @Column(nullable = false, length = 200)
    private String academyName;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30)
    private ApplicationStatus status = ApplicationStatus.EMAIL_UNVERIFIED;
    private UUID academyId;
    @Column(length = 1000)
    private String rejectionReason;
    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
    private Instant reviewedAt;
    private UUID reviewedBy;

    public AcademyApplication(User applicant, String academyName) {
        this.applicant = applicant;
        this.academyName = academyName.strip();
    }

    public void emailConfirmed() {
        if (status == ApplicationStatus.EMAIL_UNVERIFIED) status = ApplicationStatus.PENDING;
    }

    public void approve(UUID academyId, UUID reviewer, Instant now) {
        requirePending();
        this.academyId = academyId;
        this.status = ApplicationStatus.APPROVED;
        this.reviewedBy = reviewer;
        this.reviewedAt = now;
    }

    public void reject(String reason, UUID reviewer, Instant now) {
        requirePending();
        this.rejectionReason = reason.strip();
        this.status = ApplicationStatus.REJECTED;
        this.reviewedBy = reviewer;
        this.reviewedAt = now;
    }

    private void requirePending() {
        if (status != ApplicationStatus.PENDING) throw new IllegalStateException("Application is not pending");
    }
}
