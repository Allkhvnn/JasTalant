ALTER TABLE players ADD CONSTRAINT uq_players_academy_id UNIQUE (academy_id, id);

CREATE TABLE academy_invitations (
    id UUID PRIMARY KEY,
    academy_id UUID NOT NULL REFERENCES academies(id),
    email VARCHAR(254) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'REVOKED')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES app_users(id),
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES app_users(id),
    CONSTRAINT uq_invitations_academy_id UNIQUE (academy_id, id),
    CONSTRAINT ck_invitation_email_normalized
        CHECK (email = lower(trim(email)) AND length(email) > 0),
    CONSTRAINT ck_invitation_acceptance CHECK (
        (status = 'ACCEPTED' AND accepted_at IS NOT NULL AND accepted_by IS NOT NULL)
        OR (status IN ('PENDING', 'REVOKED') AND accepted_at IS NULL AND accepted_by IS NULL)
    )
);

CREATE UNIQUE INDEX uq_pending_invitation_academy_email
    ON academy_invitations(academy_id, email) WHERE status = 'PENDING';
CREATE INDEX idx_invitations_academy_created
    ON academy_invitations(academy_id, created_at DESC);

CREATE TABLE academy_invitation_roles (
    invitation_id UUID NOT NULL REFERENCES academy_invitations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('COACH', 'PARENT')),
    PRIMARY KEY (invitation_id, role)
);

CREATE TABLE academy_invitation_players (
    id UUID PRIMARY KEY,
    invitation_id UUID NOT NULL,
    academy_id UUID NOT NULL,
    player_id UUID NOT NULL,
    CONSTRAINT uq_invitation_player UNIQUE (invitation_id, player_id),
    CONSTRAINT fk_invitation_player_invitation FOREIGN KEY (academy_id, invitation_id)
        REFERENCES academy_invitations(academy_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_invitation_player_player FOREIGN KEY (academy_id, player_id)
        REFERENCES players(academy_id, id) ON DELETE CASCADE
);

CREATE TABLE parent_players (
    id UUID PRIMARY KEY,
    academy_id UUID NOT NULL,
    parent_membership_id UUID NOT NULL,
    player_id UUID NOT NULL,
    parent_role VARCHAR(20) NOT NULL DEFAULT 'PARENT' CHECK (parent_role = 'PARENT'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_parent_player UNIQUE (parent_membership_id, player_id),
    CONSTRAINT fk_parent_player_membership FOREIGN KEY (academy_id, parent_membership_id)
        REFERENCES academy_memberships(academy_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_parent_player_role FOREIGN KEY (parent_membership_id, parent_role)
        REFERENCES academy_membership_roles(membership_id, role) ON DELETE CASCADE,
    CONSTRAINT fk_parent_player_player FOREIGN KEY (academy_id, player_id)
        REFERENCES players(academy_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_parent_players_membership_player
    ON parent_players(parent_membership_id, player_id);
