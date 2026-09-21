CREATE TABLE academies (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL CHECK (length(trim(name)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE app_users (
    id UUID PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    full_name VARCHAR(200) NOT NULL CHECK (length(trim(full_name)) > 0),
    password_hash VARCHAR(255) NOT NULL CHECK (length(trim(password_hash)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT ck_users_email_normalized CHECK (email = lower(trim(email)) AND length(email) > 0)
);

CREATE TABLE academy_memberships (
    id UUID PRIMARY KEY,
    academy_id UUID NOT NULL REFERENCES academies(id),
    user_id UUID NOT NULL REFERENCES app_users(id),
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_membership_academy_user UNIQUE (academy_id, user_id),
    CONSTRAINT ck_membership_role CHECK (role IN ('ADMIN', 'COACH'))
);

CREATE INDEX idx_memberships_user ON academy_memberships(user_id);
