ALTER TABLE players
    ADD COLUMN avatar_data BYTEA,
    ADD COLUMN avatar_content_type VARCHAR(30),
    ADD CONSTRAINT ck_player_avatar_pair CHECK (
        (avatar_data IS NULL AND avatar_content_type IS NULL)
        OR (avatar_data IS NOT NULL AND avatar_content_type IS NOT NULL)
    ),
    ADD CONSTRAINT ck_player_avatar_size CHECK (
        avatar_data IS NULL OR octet_length(avatar_data) <= 2097152
    );

ALTER TABLE academy_memberships
    ADD COLUMN display_name VARCHAR(200),
    ADD COLUMN avatar_data BYTEA,
    ADD COLUMN avatar_content_type VARCHAR(30),
    ADD CONSTRAINT ck_membership_display_name CHECK (
        display_name IS NULL OR length(trim(display_name)) > 0
    ),
    ADD CONSTRAINT ck_membership_avatar_pair CHECK (
        (avatar_data IS NULL AND avatar_content_type IS NULL)
        OR (avatar_data IS NOT NULL AND avatar_content_type IS NOT NULL)
    ),
    ADD CONSTRAINT ck_membership_avatar_size CHECK (
        avatar_data IS NULL OR octet_length(avatar_data) <= 2097152
    );
