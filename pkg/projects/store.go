package projects

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	migrate "github.com/rubenv/sql-migrate"
)

//go:embed migrations/*.sql
var migrationFS embed.FS

// Store handles all Postgres operations for projects and users.
type Store struct {
	db *sqlx.DB
}

// NewStore opens a Postgres connection, runs migrations, and returns a ready Store.
func NewStore(dsn string) (*Store, error) {
	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("projects: connect postgres: %w", err)
	}
	db.SetMaxOpenConns(20)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(10 * time.Minute)

	if err := runMigrations(db.DB); err != nil {
		return nil, fmt.Errorf("projects: migrations: %w", err)
	}
	return &Store{db: db}, nil
}

func runMigrations(db *sql.DB) error {
	src := &migrate.EmbedFileSystemMigrationSource{
		FileSystem: migrationFS,
		Root:       "migrations",
	}
	n, err := migrate.Exec(db, "postgres", src, migrate.Up)
	if err != nil {
		return err
	}
	if n > 0 {
		log.Printf("[projects] applied %d migration(s)", n)
	}
	return nil
}

func (s *Store) Close() error { return s.db.Close() }

// ---- Users ----------------------------------------------------------------

// UpsertUser creates or updates a user from OIDC claims.
// The very first user becomes super_admin (bootstrap). All subsequent users
// default to member with no project memberships — they appear as "pending"
// until a super admin assigns them to a project.
func (s *Store) UpsertUser(ctx context.Context, email, name, oidcSub string) (*User, error) {
	var count int
	if err := s.db.GetContext(ctx, &count, `SELECT COUNT(*) FROM users WHERE global_role = 'super_admin'`); err != nil {
		return nil, err
	}
	role := RoleMember
	if count == 0 {
		role = RoleSuperAdmin
	}

	var u User
	err := s.db.GetContext(ctx, &u, `
		INSERT INTO users (email, name, global_role, oidc_sub, last_seen_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (email) DO UPDATE
		  SET name         = EXCLUDED.name,
		      oidc_sub     = COALESCE(users.oidc_sub, EXCLUDED.oidc_sub),
		      last_seen_at = NOW()
		RETURNING id, email, name, global_role, oidc_sub, last_seen_at, created_at`,
		email, name, string(role), oidcSub,
	)
	return &u, err
}

func (s *Store) GetUser(ctx context.Context, id uuid.UUID) (*User, error) {
	var u User
	err := s.db.GetContext(ctx, &u,
		`SELECT id, email, name, global_role, oidc_sub, last_seen_at, created_at FROM users WHERE id = $1`, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &u, err
}

func (s *Store) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	var u User
	err := s.db.GetContext(ctx, &u,
		`SELECT id, email, name, global_role, oidc_sub, last_seen_at, created_at FROM users WHERE email = $1`, email)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &u, err
}

func (s *Store) ListUsers(ctx context.Context) ([]User, error) {
	var users []User
	err := s.db.SelectContext(ctx, &users,
		`SELECT id, email, name, global_role, last_seen_at, created_at FROM users ORDER BY created_at`)
	return users, err
}

func (s *Store) SetGlobalRole(ctx context.Context, userID uuid.UUID, role GlobalRole) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE users SET global_role = $1 WHERE id = $2`, string(role), userID)
	return err
}

// ---- Projects -------------------------------------------------------------

func (s *Store) CreateProject(ctx context.Context, slug, displayName, description, color string, createdBy uuid.UUID) (*Project, error) {
	var p Project
	err := s.db.GetContext(ctx, &p, `
		INSERT INTO projects (slug, display_name, description, color, created_by)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, slug, display_name, description, color, created_by, created_at`,
		slug, displayName, description, color, createdBy,
	)
	return &p, err
}

func (s *Store) GetProject(ctx context.Context, id uuid.UUID) (*ProjectWithDetails, error) {
	var p ProjectWithDetails
	err := s.db.GetContext(ctx, &p.Project, `
		SELECT id, slug, display_name, description, color, created_by, created_at
		FROM projects WHERE id = $1`, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	members, err := s.listMembers(ctx, id)
	if err != nil {
		return nil, err
	}
	nss, err := s.listNamespaces(ctx, id)
	if err != nil {
		return nil, err
	}
	p.Members = members
	p.Namespaces = nss
	p.MemberCount = len(members)
	return &p, nil
}

func (s *Store) ListProjects(ctx context.Context) ([]ProjectWithDetails, error) {
	var projects []Project
	if err := s.db.SelectContext(ctx, &projects,
		`SELECT id, slug, display_name, description, color, created_by, created_at FROM projects ORDER BY display_name`); err != nil {
		return nil, err
	}
	out := make([]ProjectWithDetails, len(projects))
	for i, p := range projects {
		out[i].Project = p
		members, err := s.listMembers(ctx, p.ID)
		if err != nil {
			return nil, err
		}
		nss, err := s.listNamespaces(ctx, p.ID)
		if err != nil {
			return nil, err
		}
		out[i].Members = members
		out[i].Namespaces = nss
		out[i].MemberCount = len(members)
	}
	return out, nil
}

func (s *Store) UpdateProject(ctx context.Context, id uuid.UUID, displayName, description, color string) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE projects SET display_name=$1, description=$2, color=$3 WHERE id=$4`,
		displayName, description, color, id)
	return err
}

func (s *Store) DeleteProject(ctx context.Context, id uuid.UUID) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM projects WHERE id = $1`, id)
	return err
}

// ---- Project namespaces ---------------------------------------------------

func (s *Store) AddNamespace(ctx context.Context, projectID uuid.UUID, clusterCtx, ns, labelSelector string) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO project_namespaces (project_id, cluster_context, namespace, label_selector)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT DO NOTHING`,
		projectID, clusterCtx, ns, labelSelector)
	return err
}

func (s *Store) RemoveNamespace(ctx context.Context, projectID uuid.UUID, clusterCtx, ns string) error {
	_, err := s.db.ExecContext(ctx,
		`DELETE FROM project_namespaces WHERE project_id=$1 AND cluster_context=$2 AND namespace=$3`,
		projectID, clusterCtx, ns)
	return err
}

func (s *Store) listNamespaces(ctx context.Context, projectID uuid.UUID) ([]ProjectNamespace, error) {
	var nss []ProjectNamespace
	err := s.db.SelectContext(ctx, &nss,
		`SELECT project_id, cluster_context, namespace, label_selector
		 FROM project_namespaces WHERE project_id=$1 ORDER BY cluster_context, namespace`, projectID)
	return nss, err
}

// ---- Project members ------------------------------------------------------

func (s *Store) AddMember(ctx context.Context, projectID, userID uuid.UUID, role ProjectRole, addedBy uuid.UUID) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO project_members (project_id, user_id, role, added_by)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
		projectID, userID, string(role), addedBy)
	return err
}

func (s *Store) RemoveMember(ctx context.Context, projectID, userID uuid.UUID) error {
	_, err := s.db.ExecContext(ctx,
		`DELETE FROM project_members WHERE project_id=$1 AND user_id=$2`, projectID, userID)
	return err
}

func (s *Store) UpdateMemberRole(ctx context.Context, projectID, userID uuid.UUID, role ProjectRole) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE project_members SET role=$1 WHERE project_id=$2 AND user_id=$3`,
		string(role), projectID, userID)
	return err
}

func (s *Store) listMembers(ctx context.Context, projectID uuid.UUID) ([]ProjectMember, error) {
	rows, err := s.db.QueryxContext(ctx, `
		SELECT pm.project_id, pm.user_id, pm.role, pm.added_by, pm.added_at,
		       u.email, u.name, u.global_role, u.last_seen_at, u.created_at
		FROM project_members pm
		JOIN users u ON u.id = pm.user_id
		WHERE pm.project_id = $1
		ORDER BY pm.added_at`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []ProjectMember
	for rows.Next() {
		var m ProjectMember
		var u User
		if err := rows.Scan(
			&m.ProjectID, &m.UserID, &m.Role, &m.AddedBy, &m.AddedAt,
			&u.Email, &u.Name, &u.GlobalRole, &u.LastSeenAt, &u.CreatedAt,
		); err != nil {
			return nil, err
		}
		u.ID = m.UserID
		m.User = &u
		members = append(members, m)
	}
	return members, rows.Err()
}

// ListProjectsForUser returns all projects the user is a member of, with their role.
func (s *Store) ListProjectsForUser(ctx context.Context, userID uuid.UUID) ([]map[string]any, error) {
	rows, err := s.db.QueryxContext(ctx, `
		SELECT p.id, p.slug, p.display_name, p.color, pm.role
		FROM project_members pm
		JOIN projects p ON p.id = pm.project_id
		WHERE pm.user_id = $1
		ORDER BY p.display_name`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []map[string]any
	for rows.Next() {
		var id, slug, displayName, color, role string
		if err := rows.Scan(&id, &slug, &displayName, &color, &role); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{
			"id": id, "slug": slug, "displayName": displayName,
			"color": color, "role": role,
		})
	}
	return out, rows.Err()
}

// ---- Access resolution ----------------------------------------------------

// ResolveAccess loads all project memberships for a user and builds a UserAccess.
// Called on Redis cache miss; result is written back to cache by the caller.
func (s *Store) ResolveAccess(ctx context.Context, userID uuid.UUID) (*UserAccess, error) {
	u, err := s.GetUser(ctx, userID)
	if err != nil || u == nil {
		return nil, fmt.Errorf("projects: user %s not found", userID)
	}

	access := &UserAccess{
		UserID:     userID,
		GlobalRole: u.GlobalRole,
		allowedNS:  make(map[string]ProjectRole),
	}
	if u.GlobalRole == RoleSuperAdmin {
		return access, nil
	}

	rows, err := s.db.QueryxContext(ctx, `
		SELECT pm.role, pn.cluster_context, pn.namespace
		FROM project_members pm
		JOIN project_namespaces pn ON pn.project_id = pm.project_id
		WHERE pm.user_id = $1`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var role ProjectRole
		var clusterCtx, ns string
		if err := rows.Scan(&role, &clusterCtx, &ns); err != nil {
			return nil, err
		}
		key := clusterCtx + "/" + ns
		// keep the most permissive role if the user is in multiple projects that share a namespace
		if existing, ok := access.allowedNS[key]; !ok || roleRank(role) > roleRank(existing) {
			access.allowedNS[key] = role
		}
	}
	return access, rows.Err()
}

func roleRank(r ProjectRole) int {
	switch r {
	case ProjectRoleAdmin:
		return 2
	case ProjectRoleMember:
		return 1
	default:
		return 0
	}
}

// ---- Audit ----------------------------------------------------------------

func (s *Store) WriteAuditEvent(ctx context.Context, evt AuditEvent, refJSON []byte) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO audit_log (actor_id, action, resource_kind, resource_ref, project_id, occurred_at)
		VALUES ($1, $2, $3, $4, $5, NOW())`,
		evt.ActorID, evt.Action, evt.ResourceKind, refJSON, evt.ProjectID)
	return err
}

func (s *Store) ListAuditEvents(ctx context.Context, limit int) ([]map[string]any, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT al.id, al.action, al.resource_kind, al.resource_ref, al.occurred_at,
		       u.email AS actor_email
		FROM audit_log al
		LEFT JOIN users u ON u.id = al.actor_id
		ORDER BY al.occurred_at DESC
		LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []map[string]any
	cols, _ := rows.Columns()
	for rows.Next() {
		vals := make([]any, len(cols))
		ptrs := make([]any, len(cols))
		for i := range vals {
			ptrs[i] = &vals[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			return nil, err
		}
		row := make(map[string]any, len(cols))
		for i, c := range cols {
			row[c] = vals[i]
		}
		out = append(out, row)
	}
	return out, rows.Err()
}
