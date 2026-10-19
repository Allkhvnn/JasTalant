-- IDs and names are snapshots, deliberately without foreign keys: history survives deletion.
CREATE TABLE audit_events (
    id UUID PRIMARY KEY,
    academy_id UUID,
    actor_id UUID NOT NULL,
    actor_name VARCHAR(200) NOT NULL,
    action VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    target_name VARCHAR(300) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_audit_academy_time ON audit_events(academy_id, occurred_at DESC, id DESC);
CREATE INDEX idx_audit_academy_actor_time ON audit_events(academy_id, actor_id, occurred_at DESC);
CREATE INDEX idx_audit_academy_action_time ON audit_events(academy_id, action, occurred_at DESC);
