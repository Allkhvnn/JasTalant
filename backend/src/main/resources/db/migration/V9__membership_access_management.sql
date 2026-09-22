ALTER TABLE academy_memberships
    ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

CREATE INDEX idx_memberships_academy_active
    ON academy_memberships(academy_id, active);
