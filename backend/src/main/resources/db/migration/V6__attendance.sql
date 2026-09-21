CREATE TABLE attendance_sessions (
    id UUID PRIMARY KEY,
    academy_id UUID NOT NULL,
    group_id UUID NOT NULL,
    training_date DATE NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_attendance_session_group_date UNIQUE (academy_id, group_id, training_date),
    CONSTRAINT uq_attendance_sessions_academy_id UNIQUE (academy_id, id),
    CONSTRAINT fk_attendance_session_group FOREIGN KEY (academy_id, group_id)
        REFERENCES training_groups(academy_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_attendance_sessions_group_date
    ON attendance_sessions(academy_id, group_id, training_date DESC);

CREATE TABLE attendance_records (
    id UUID PRIMARY KEY,
    academy_id UUID NOT NULL,
    session_id UUID NOT NULL,
    player_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED')),
    comment VARCHAR(300),
    CONSTRAINT uq_attendance_session_player UNIQUE (session_id, player_id),
    CONSTRAINT fk_attendance_record_session FOREIGN KEY (academy_id, session_id)
        REFERENCES attendance_sessions(academy_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_attendance_record_player FOREIGN KEY (academy_id, player_id)
        REFERENCES players(academy_id, id)
);
CREATE INDEX idx_attendance_records_player
    ON attendance_records(academy_id, player_id, session_id);
