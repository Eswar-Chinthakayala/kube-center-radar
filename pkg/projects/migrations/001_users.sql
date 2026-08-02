-- +migrate Up
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email        TEXT        UNIQUE NOT NULL,
    name         TEXT        NOT NULL DEFAULT '',
    global_role  TEXT        NOT NULL DEFAULT 'member'
                             CHECK (global_role IN ('super_admin', 'member')),
    oidc_sub     TEXT        UNIQUE,
    idp_groups   TEXT[]      NOT NULL DEFAULT '{}',
    last_seen_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_oidc_sub ON users(oidc_sub);

-- +migrate Down
DROP TABLE IF EXISTS users;
