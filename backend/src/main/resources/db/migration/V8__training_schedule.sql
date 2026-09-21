CREATE TABLE scheduled_trainings (
    id UUID PRIMARY KEY,
    academy_id UUID NOT NULL,
    group_id UUID NOT NULL,
    coach_membership_id UUID NOT NULL,
    training_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(200),
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED'
        CHECK (status IN ('SCHEDULED', 'CANCELLED')),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_scheduled_training_time CHECK (end_time > start_time),
    CONSTRAINT uq_scheduled_training_slot UNIQUE (academy_id, group_id, training_date, start_time),
    CONSTRAINT uq_scheduled_training_academy_id UNIQUE (academy_id, id),
    CONSTRAINT uq_scheduled_training_attendance_link UNIQUE (academy_id, id, group_id, training_date),
    CONSTRAINT fk_scheduled_training_group FOREIGN KEY (academy_id, group_id)
        REFERENCES training_groups(academy_id, id),
    CONSTRAINT fk_scheduled_training_coach FOREIGN KEY (academy_id, coach_membership_id)
        REFERENCES academy_memberships(academy_id, id)
);

CREATE INDEX idx_scheduled_trainings_calendar
    ON scheduled_trainings(academy_id, training_date, start_time, id);
CREATE INDEX idx_scheduled_trainings_coach
    ON scheduled_trainings(academy_id, coach_membership_id, training_date);

ALTER TABLE attendance_sessions ADD COLUMN training_id UUID;
ALTER TABLE attendance_sessions DROP CONSTRAINT uq_attendance_session_group_date;
ALTER TABLE attendance_sessions ADD CONSTRAINT uq_attendance_session_training UNIQUE (training_id);
ALTER TABLE attendance_sessions ADD CONSTRAINT fk_attendance_session_training
    FOREIGN KEY (academy_id, training_id, group_id, training_date)
    REFERENCES scheduled_trainings(academy_id, id, group_id, training_date);

CREATE UNIQUE INDEX uq_attendance_session_legacy_group_date
    ON attendance_sessions(academy_id, group_id, training_date)
    WHERE training_id IS NULL;
