CREATE TABLE player_development_assessments (
    id UUID PRIMARY KEY,
    academy_id UUID NOT NULL,
    player_id UUID NOT NULL,
    assessment_date DATE NOT NULL CHECK (assessment_date <= CURRENT_DATE),
    technique NUMERIC(3, 1) NOT NULL CHECK (technique BETWEEN 0 AND 10),
    speed NUMERIC(3, 1) NOT NULL CHECK (speed BETWEEN 0 AND 10),
    endurance NUMERIC(3, 1) NOT NULL CHECK (endurance BETWEEN 0 AND 10),
    physical_fitness NUMERIC(3, 1) NOT NULL CHECK (physical_fitness BETWEEN 0 AND 10),
    game_intelligence NUMERIC(3, 1) NOT NULL CHECK (game_intelligence BETWEEN 0 AND 10),
    comment VARCHAR(500),
    created_by_user_id UUID NOT NULL REFERENCES app_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_player_development_assessment_date UNIQUE (academy_id, player_id, assessment_date),
    CONSTRAINT fk_player_development_assessment_player
        FOREIGN KEY (academy_id, player_id) REFERENCES players(academy_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_player_development_assessments_history
    ON player_development_assessments(academy_id, player_id, assessment_date DESC, id DESC);
