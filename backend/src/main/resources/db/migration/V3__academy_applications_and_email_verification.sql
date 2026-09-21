ALTER TABLE app_users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE app_users ADD COLUMN verification_token_hash VARCHAR(64) UNIQUE;
ALTER TABLE app_users ADD COLUMN verification_expires_at TIMESTAMPTZ;
ALTER TABLE app_users ADD CONSTRAINT ck_verification_token_pair
    CHECK ((verification_token_hash IS NULL) = (verification_expires_at IS NULL));

CREATE TABLE academy_applications (
    id UUID PRIMARY KEY,
    applicant_id UUID NOT NULL UNIQUE REFERENCES app_users(id),
    academy_name VARCHAR(200) NOT NULL CHECK (length(trim(academy_name)) > 0),
    status VARCHAR(30) NOT NULL CHECK (status IN ('EMAIL_UNVERIFIED', 'PENDING', 'APPROVED', 'REJECTED')),
    academy_id UUID UNIQUE REFERENCES academies(id),
    rejection_reason VARCHAR(1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES app_users(id),
    CONSTRAINT ck_application_decision CHECK (
        (status IN ('EMAIL_UNVERIFIED', 'PENDING') AND academy_id IS NULL AND rejection_reason IS NULL
            AND reviewed_at IS NULL AND reviewed_by IS NULL)
        OR (status = 'APPROVED' AND academy_id IS NOT NULL AND rejection_reason IS NULL
            AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
        OR (status = 'REJECTED' AND academy_id IS NULL AND length(trim(rejection_reason)) > 0
            AND rejection_reason IS NOT NULL AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
    )
);
CREATE INDEX idx_applications_status_created ON academy_applications(status, created_at);
