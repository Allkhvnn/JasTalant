ALTER TABLE academy_applications
    ADD COLUMN mail_language VARCHAR(2) NOT NULL DEFAULT 'ru'
        CHECK (mail_language IN ('ru', 'kk', 'en')),
    ADD COLUMN submitted_at TIMESTAMPTZ;
UPDATE academy_applications SET submitted_at = created_at;
ALTER TABLE academy_applications ALTER COLUMN submitted_at SET NOT NULL;
CREATE INDEX idx_applications_status_submitted ON academy_applications(status, submitted_at, id);

-- A snapshot is persisted in the same transaction as the decision, and survives resubmission.
CREATE TABLE application_decision_mail (
    id UUID PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES academy_applications(id) ON DELETE CASCADE,
    recipient VARCHAR(254) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    next_attempt_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0)
);
CREATE INDEX idx_application_mail_pending ON application_decision_mail(next_attempt_at, created_at, id)
    WHERE sent_at IS NULL;
