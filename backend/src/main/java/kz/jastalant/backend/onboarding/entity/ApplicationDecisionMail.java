package kz.jastalant.backend.onboarding.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "application_decision_mail")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ApplicationDecisionMail {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false)
    private UUID applicationId;
    @Column(nullable = false, length = 254)
    private String recipient;
    @Column(nullable = false, length = 200)
    private String subject;
    @Column(nullable = false, columnDefinition = "text")
    private String body;
    @Column(nullable = false)
    private Instant createdAt;
    @Column(nullable = false)
    private Instant nextAttemptAt;
    private Instant sentAt;
    @Column(nullable = false)
    private int attempts;

    public ApplicationDecisionMail(UUID applicationId, String recipient, String subject, String body, Instant now) {
        this.applicationId = applicationId;
        this.recipient = recipient;
        this.subject = subject;
        this.body = body;
        this.createdAt = now;
        this.nextAttemptAt = now;
    }

    public void delivered(Instant now) {
        attempts++;
        sentAt = now;
    }

    public void retryLater(Instant now) {
        attempts++;
        nextAttemptAt = now.plusSeconds(Math.min(3600, 60L << Math.min(attempts - 1, 6)));
    }
}
