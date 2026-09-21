ALTER TABLE academy_memberships ADD CONSTRAINT uq_memberships_academy_id UNIQUE (academy_id, id);

CREATE TABLE training_groups (
    id UUID PRIMARY KEY,
    academy_id UUID NOT NULL REFERENCES academies(id),
    name VARCHAR(200) NOT NULL CHECK (length(trim(name)) > 0),
    age_category VARCHAR(30) NOT NULL CHECK (length(trim(age_category)) > 0),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_groups_academy_id UNIQUE (academy_id, id)
);

CREATE TABLE group_coaches (
    id UUID PRIMARY KEY,
    academy_id UUID NOT NULL,
    group_id UUID NOT NULL,
    membership_id UUID NOT NULL,
    coach_role VARCHAR(20) NOT NULL DEFAULT 'COACH' CHECK (coach_role = 'COACH'),
    CONSTRAINT uq_group_coach UNIQUE (group_id, membership_id),
    CONSTRAINT fk_coach_group FOREIGN KEY (academy_id, group_id)
        REFERENCES training_groups(academy_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_coach_membership FOREIGN KEY (academy_id, membership_id)
        REFERENCES academy_memberships(academy_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_coach_role FOREIGN KEY (membership_id, coach_role)
        REFERENCES academy_membership_roles(membership_id, role) ON DELETE CASCADE
);
CREATE INDEX idx_coaches_membership_group ON group_coaches(membership_id, group_id);

CREATE TABLE players (
    id UUID PRIMARY KEY,
    academy_id UUID NOT NULL REFERENCES academies(id),
    group_id UUID NOT NULL,
    full_name VARCHAR(200) NOT NULL CHECK (length(trim(full_name)) > 0),
    date_of_birth DATE NOT NULL CHECK (date_of_birth < CURRENT_DATE),
    parent_name VARCHAR(200),
    parent_phone VARCHAR(30),
    parent_email VARCHAR(254),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_player_group FOREIGN KEY (academy_id, group_id)
        REFERENCES training_groups(academy_id, id)
);
CREATE INDEX idx_players_academy_group ON players(academy_id, group_id);
