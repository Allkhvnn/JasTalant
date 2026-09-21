ALTER TABLE app_users ADD COLUMN platform_role VARCHAR(20) NOT NULL DEFAULT 'USER';
ALTER TABLE app_users ADD CONSTRAINT ck_users_platform_role
    CHECK (platform_role IN ('USER', 'SUPER_ADMIN'));

CREATE TABLE academy_membership_roles (
    membership_id UUID NOT NULL REFERENCES academy_memberships(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    PRIMARY KEY (membership_id, role),
    CONSTRAINT ck_academy_membership_role CHECK (role IN ('ADMIN', 'COACH', 'PARENT'))
);

INSERT INTO academy_membership_roles (membership_id, role)
SELECT id, role FROM academy_memberships;

ALTER TABLE academy_memberships DROP COLUMN role;
