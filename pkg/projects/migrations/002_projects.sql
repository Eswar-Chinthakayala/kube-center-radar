-- +migrate Up
CREATE TABLE projects (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug         TEXT        UNIQUE NOT NULL,
    display_name TEXT        NOT NULL,
    description  TEXT        NOT NULL DEFAULT '',
    color        TEXT        NOT NULL DEFAULT '#3b82f6',
    created_by   UUID        REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_members (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    role       TEXT NOT NULL CHECK (role IN ('project_admin', 'member', 'viewer')),
    added_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, user_id)
);

CREATE TABLE project_namespaces (
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    cluster_context TEXT NOT NULL,
    namespace       TEXT NOT NULL,
    label_selector  TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (project_id, cluster_context, namespace)
);

CREATE TABLE audit_log (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id      UUID        REFERENCES users(id)    ON DELETE SET NULL,
    action        TEXT        NOT NULL,
    resource_kind TEXT        NOT NULL DEFAULT '',
    resource_ref  JSONB       NOT NULL DEFAULT '{}',
    project_id    UUID        REFERENCES projects(id) ON DELETE SET NULL,
    occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pm_user          ON project_members(user_id);
CREATE INDEX idx_pn_project       ON project_namespaces(project_id);
CREATE INDEX idx_audit_actor      ON audit_log(actor_id);
CREATE INDEX idx_audit_project    ON audit_log(project_id);
CREATE INDEX idx_audit_occurred   ON audit_log(occurred_at DESC);

-- +migrate Down
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS project_namespaces;
DROP TABLE IF EXISTS project_members;
DROP TABLE IF EXISTS projects;
