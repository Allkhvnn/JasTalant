package kz.jastalant.backend.onboarding.repository;

import kz.jastalant.backend.onboarding.entity.ApplicationDecisionMail;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface ApplicationDecisionMailRepository extends Repository<ApplicationDecisionMail, UUID> {
    ApplicationDecisionMail save(ApplicationDecisionMail message);

    // Each worker holds the row lock through delivery; other workers can process other messages.
    @Query(value = """
            select * from application_decision_mail
            where sent_at is null and next_attempt_at <= :now
            order by next_attempt_at, created_at, id
            limit 1 for update skip locked
            """, nativeQuery = true)
    Optional<ApplicationDecisionMail> lockNextDue(Instant now);
}
