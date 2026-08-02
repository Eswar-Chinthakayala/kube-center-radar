package projects

import (
	"time"

	"github.com/google/uuid"
)

type GlobalRole string

const (
	RoleSuperAdmin GlobalRole = "super_admin"
	RoleMember     GlobalRole = "member"
)

type ProjectRole string

const (
	ProjectRoleAdmin  ProjectRole = "project_admin"
	ProjectRoleMember ProjectRole = "member"
	ProjectRoleViewer ProjectRole = "viewer"
)

type User struct {
	ID          uuid.UUID  `db:"id"           json:"id"`
	Email       string     `db:"email"         json:"email"`
	Name        string     `db:"name"          json:"name"`
	GlobalRole  GlobalRole `db:"global_role"   json:"globalRole"`
	OIDCSub     *string    `db:"oidc_sub"      json:"-"`
	LastSeenAt  *time.Time `db:"last_seen_at"  json:"lastSeenAt,omitempty"`
	CreatedAt   time.Time  `db:"created_at"    json:"createdAt"`
}

type Project struct {
	ID          uuid.UUID  `db:"id"           json:"id"`
	Slug        string     `db:"slug"          json:"slug"`
	DisplayName string     `db:"display_name"  json:"displayName"`
	Description string     `db:"description"   json:"description"`
	Color       string     `db:"color"         json:"color"`
	CreatedBy   *uuid.UUID `db:"created_by"    json:"createdBy,omitempty"`
	CreatedAt   time.Time  `db:"created_at"    json:"createdAt"`
}

type ProjectMember struct {
	ProjectID uuid.UUID   `db:"project_id" json:"projectId"`
	UserID    uuid.UUID   `db:"user_id"    json:"userId"`
	Role      ProjectRole `db:"role"       json:"role"`
	AddedBy   *uuid.UUID  `db:"added_by"   json:"addedBy,omitempty"`
	AddedAt   time.Time   `db:"added_at"   json:"addedAt"`
	User      *User       `db:"-"          json:"user,omitempty"`
}

type ProjectNamespace struct {
	ProjectID      uuid.UUID `db:"project_id"      json:"projectId"`
	ClusterContext string    `db:"cluster_context" json:"clusterContext"`
	Namespace      string    `db:"namespace"       json:"namespace"`
	LabelSelector  string    `db:"label_selector"  json:"labelSelector"`
}

type ProjectWithDetails struct {
	Project
	Members     []ProjectMember    `json:"members"`
	Namespaces  []ProjectNamespace `json:"namespaces"`
	MemberCount int                `json:"memberCount"`
}

type AuditEvent struct {
	ActorID      uuid.UUID  `json:"actorId"`
	Action       string     `json:"action"`
	ResourceKind string     `json:"resourceKind"`
	ResourceRef  any        `json:"resourceRef"`
	ProjectID    *uuid.UUID `json:"projectId,omitempty"`
}

// UserAccess is the resolved permission set for one request, populated from
// the Redis cache (or recomputed from Postgres on cache miss).
type UserAccess struct {
	UserID     uuid.UUID
	GlobalRole GlobalRole
	// allowedNS maps "clusterCtx/namespace" → highest ProjectRole the user holds
	allowedNS map[string]ProjectRole
}

func (a *UserAccess) IsSuperAdmin() bool {
	return a.GlobalRole == RoleSuperAdmin
}

// AllowedNamespaces returns a flat list of "clusterCtx/namespace" keys.
func (a *UserAccess) AllowedNamespaces() []string {
	if a.IsSuperAdmin() {
		return nil // caller must treat nil as "all"
	}
	out := make([]string, 0, len(a.allowedNS))
	for k := range a.allowedNS {
		out = append(out, k)
	}
	return out
}

// CanSeeNamespace reports whether the user can read resources in the given namespace.
func (a *UserAccess) CanSeeNamespace(clusterCtx, ns string) bool {
	if a.IsSuperAdmin() {
		return true
	}
	_, ok := a.allowedNS[clusterCtx+"/"+ns]
	return ok
}

// CanExec reports whether the user can open a terminal or view logs in the namespace.
// Super Admin, Project Admin, and Project Member all have this capability.
func (a *UserAccess) CanExec(clusterCtx, ns string) bool {
	if a.IsSuperAdmin() {
		return true
	}
	role, ok := a.allowedNS[clusterCtx+"/"+ns]
	return ok && (role == ProjectRoleAdmin || role == ProjectRoleMember)
}

// CanRestart reports whether the user can restart pods/deployments.
// Applies to Project Member and above — Viewer cannot.
func (a *UserAccess) CanRestart(clusterCtx, ns string) bool {
	return a.CanExec(clusterCtx, ns) // same set: admin + member
}

// CanDelete always returns false for everyone except Super Admin.
// No delete permission for Project Admin, Member, or Viewer.
func (a *UserAccess) CanDelete(clusterCtx, ns string) bool {
	return a.IsSuperAdmin()
}

// CanWriteYAML reports whether the user can apply/edit YAML in a namespace.
// Project Admins can write to any project namespace; Members are blocked from prod.
func (a *UserAccess) CanWriteYAML(clusterCtx, ns string, isProd bool) bool {
	if a.IsSuperAdmin() {
		return true
	}
	role, ok := a.allowedNS[clusterCtx+"/"+ns]
	if !ok {
		return false
	}
	if isProd {
		return role == ProjectRoleAdmin
	}
	return role == ProjectRoleAdmin || role == ProjectRoleMember
}

// CanManageMembers reports whether the user can add/remove members in a project.
func (a *UserAccess) CanManageMembers(projectID uuid.UUID) bool {
	if a.IsSuperAdmin() {
		return true
	}
	for k, role := range a.allowedNS {
		_ = k
		if role == ProjectRoleAdmin {
			return true
		}
	}
	return false
}
