ALTER TABLE academies
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN status_reason VARCHAR(500),
    ADD COLUMN status_changed_at TIMESTAMPTZ,
    ADD COLUMN status_changed_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE academies
    ADD CONSTRAINT ck_academy_status
        CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED'));

CREATE INDEX idx_academies_status_name ON academies(status, name, id);
