package server

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/skyhook-io/radar/pkg/projects"
)

// registerAdminRoutes mounts all /api/admin/* endpoints.
// Call once from New() after the main router is set up.
func (s *Server) registerAdminRoutes(r chi.Router) {
	// /api/admin/me is always available (returns projectsEnabled:false when store is nil)
	r.Get("/api/admin/me", s.handleAdminMe)

	if s.projectStore == nil {
		return
	}
	r.Route("/api/admin", func(r chi.Router) {
		r.Use(s.projectsMiddleware)

		// Super Admin only
		r.Group(func(r chi.Router) {
			r.Use(s.requireSuperAdmin)

			r.Get("/users", s.handleListUsers)
			r.Put("/users/{userID}/role", s.handleSetGlobalRole)

			r.Post("/projects", s.handleCreateProject)
			r.Delete("/projects/{projectID}", s.handleDeleteProject)
			r.Post("/projects/{projectID}/namespaces", s.handleAddNamespace)
			r.Delete("/projects/{projectID}/namespaces", s.handleRemoveNamespace)

			r.Get("/audit", s.handleListAudit)
		})

		// Project Admin and above
		r.Group(func(r chi.Router) {
			r.Use(s.requireProjectAdmin)

			r.Get("/projects", s.handleListProjects)
			r.Get("/projects/{projectID}", s.handleGetProject)
			r.Put("/projects/{projectID}", s.handleUpdateProject)

			r.Get("/projects/{projectID}/members", s.handleListMembers)
			r.Post("/projects/{projectID}/members", s.handleAddMember)
			r.Put("/projects/{projectID}/members/{userID}", s.handleUpdateMemberRole)
			r.Delete("/projects/{projectID}/members/{userID}", s.handleRemoveMember)
		})
	})
}

// ---- Users ----------------------------------------------------------------

func (s *Server) handleListUsers(w http.ResponseWriter, r *http.Request) {
	users, err := s.projectStore.ListUsers(r.Context())
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, "failed to list users")
		return
	}
	s.writeJSON(w, users)
}

func (s *Server) handleSetGlobalRole(w http.ResponseWriter, r *http.Request) {
	userID, err := uuid.Parse(chi.URLParam(r, "userID"))
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid user ID")
		return
	}
	var body struct {
		Role projects.GlobalRole `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if body.Role != projects.RoleSuperAdmin && body.Role != projects.RoleMember {
		s.writeError(w, http.StatusBadRequest, "role must be super_admin or member")
		return
	}
	if err := s.projectStore.SetGlobalRole(r.Context(), userID, body.Role); err != nil {
		s.writeError(w, http.StatusInternalServerError, "failed to update role")
		return
	}
	_ = s.projectCache.InvalidateAccess(r.Context(), userID)
	w.WriteHeader(http.StatusNoContent)
}

// ---- Projects -------------------------------------------------------------

func (s *Server) handleListProjects(w http.ResponseWriter, r *http.Request) {
	all, err := s.projectStore.ListProjects(r.Context())
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, "failed to list projects")
		return
	}
	// Non-super-admins only see their own projects
	access := accessFromCtx(r)
	if access != nil && !access.IsSuperAdmin() {
		filtered := all[:0]
		for _, p := range all {
			for _, m := range p.Members {
				if uid, ok := userIDFromCtx(r); ok && m.UserID == uid {
					filtered = append(filtered, p)
					break
				}
			}
		}
		all = filtered
	}
	s.writeJSON(w, all)
}

func (s *Server) handleGetProject(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "projectID"))
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid project ID")
		return
	}
	p, err := s.projectStore.GetProject(r.Context(), id)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, "failed to get project")
		return
	}
	if p == nil {
		s.writeError(w, http.StatusNotFound, "project not found")
		return
	}
	s.writeJSON(w, p)
}

func (s *Server) handleCreateProject(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Slug        string `json:"slug"`
		DisplayName string `json:"displayName"`
		Description string `json:"description"`
		Color       string `json:"color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if body.Slug == "" || body.DisplayName == "" {
		s.writeError(w, http.StatusBadRequest, "slug and displayName are required")
		return
	}
	if body.Color == "" {
		body.Color = "#3b82f6"
	}
	actorID, _ := userIDFromCtx(r)
	p, err := s.projectStore.CreateProject(r.Context(), body.Slug, body.DisplayName, body.Description, body.Color, actorID)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, "failed to create project")
		return
	}
	s.projectQueue.PublishAudit(projects.AuditEvent{
		ActorID: actorID, Action: "create_project", ResourceKind: "Project",
		ResourceRef: map[string]string{"id": p.ID.String(), "slug": p.Slug},
	})
	w.WriteHeader(http.StatusCreated)
	s.writeJSON(w, p)
}

func (s *Server) handleUpdateProject(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "projectID"))
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid project ID")
		return
	}
	var body struct {
		DisplayName string `json:"displayName"`
		Description string `json:"description"`
		Color       string `json:"color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := s.projectStore.UpdateProject(r.Context(), id, body.DisplayName, body.Description, body.Color); err != nil {
		s.writeError(w, http.StatusInternalServerError, "failed to update project")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleDeleteProject(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "projectID"))
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid project ID")
		return
	}
	actorID, _ := userIDFromCtx(r)
	if err := s.projectStore.DeleteProject(r.Context(), id); err != nil {
		s.writeError(w, http.StatusInternalServerError, "failed to delete project")
		return
	}
	_ = s.projectCache.InvalidateAccessByProject(r.Context(), id, s.projectStore)
	s.projectQueue.PublishAudit(projects.AuditEvent{
		ActorID: actorID, Action: "delete_project", ResourceKind: "Project",
		ResourceRef: map[string]string{"id": id.String()},
	})
	w.WriteHeader(http.StatusNoContent)
}

// ---- Namespaces (Super Admin only) ----------------------------------------

func (s *Server) handleAddNamespace(w http.ResponseWriter, r *http.Request) {
	projectID, err := uuid.Parse(chi.URLParam(r, "projectID"))
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid project ID")
		return
	}
	var body struct {
		ClusterContext string `json:"clusterContext"`
		Namespace      string `json:"namespace"`
		LabelSelector  string `json:"labelSelector"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if body.ClusterContext == "" || body.Namespace == "" {
		s.writeError(w, http.StatusBadRequest, "clusterContext and namespace are required")
		return
	}
	if err := s.projectStore.AddNamespace(r.Context(), projectID, body.ClusterContext, body.Namespace, body.LabelSelector); err != nil {
		s.writeError(w, http.StatusInternalServerError, "failed to add namespace")
		return
	}
	_ = s.projectCache.InvalidateAccessByProject(r.Context(), projectID, s.projectStore)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleRemoveNamespace(w http.ResponseWriter, r *http.Request) {
	projectID, err := uuid.Parse(chi.URLParam(r, "projectID"))
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid project ID")
		return
	}
	var body struct {
		ClusterContext string `json:"clusterContext"`
		Namespace      string `json:"namespace"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := s.projectStore.RemoveNamespace(r.Context(), projectID, body.ClusterContext, body.Namespace); err != nil {
		s.writeError(w, http.StatusInternalServerError, "failed to remove namespace")
		return
	}
	_ = s.projectCache.InvalidateAccessByProject(r.Context(), projectID, s.projectStore)
	w.WriteHeader(http.StatusNoContent)
}

// ---- Members --------------------------------------------------------------

func (s *Server) handleListMembers(w http.ResponseWriter, r *http.Request) {
	projectID, err := uuid.Parse(chi.URLParam(r, "projectID"))
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid project ID")
		return
	}
	p, err := s.projectStore.GetProject(r.Context(), projectID)
	if err != nil || p == nil {
		s.writeError(w, http.StatusNotFound, "project not found")
		return
	}
	s.writeJSON(w, p.Members)
}

func (s *Server) handleAddMember(w http.ResponseWriter, r *http.Request) {
	projectID, err := uuid.Parse(chi.URLParam(r, "projectID"))
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid project ID")
		return
	}
	var body struct {
		Email string              `json:"email"`
		Role  projects.ProjectRole `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if body.Email == "" {
		s.writeError(w, http.StatusBadRequest, "email is required")
		return
	}
	if body.Role != projects.ProjectRoleAdmin && body.Role != projects.ProjectRoleMember && body.Role != projects.ProjectRoleViewer {
		s.writeError(w, http.StatusBadRequest, "role must be project_admin, member, or viewer")
		return
	}

	user, err := s.projectStore.GetUserByEmail(r.Context(), body.Email)
	if err != nil || user == nil {
		s.writeError(w, http.StatusNotFound, "user not found — they must log in at least once")
		return
	}
	actorID, _ := userIDFromCtx(r)
	if err := s.projectStore.AddMember(r.Context(), projectID, user.ID, body.Role, actorID); err != nil {
		s.writeError(w, http.StatusInternalServerError, "failed to add member")
		return
	}
	_ = s.projectCache.InvalidateAccess(r.Context(), user.ID)

	// Find project name for the invite notification
	p, _ := s.projectStore.GetProject(r.Context(), projectID)
	if p != nil {
		s.projectQueue.PublishInvite(user.Email, p.DisplayName, string(body.Role))
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleUpdateMemberRole(w http.ResponseWriter, r *http.Request) {
	projectID, err := uuid.Parse(chi.URLParam(r, "projectID"))
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid project ID")
		return
	}
	userID, err := uuid.Parse(chi.URLParam(r, "userID"))
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid user ID")
		return
	}
	var body struct {
		Role projects.ProjectRole `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := s.projectStore.UpdateMemberRole(r.Context(), projectID, userID, body.Role); err != nil {
		s.writeError(w, http.StatusInternalServerError, "failed to update role")
		return
	}
	_ = s.projectCache.InvalidateAccess(r.Context(), userID)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleRemoveMember(w http.ResponseWriter, r *http.Request) {
	projectID, err := uuid.Parse(chi.URLParam(r, "projectID"))
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid project ID")
		return
	}
	userID, err := uuid.Parse(chi.URLParam(r, "userID"))
	if err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid user ID")
		return
	}
	if err := s.projectStore.RemoveMember(r.Context(), projectID, userID); err != nil {
		s.writeError(w, http.StatusInternalServerError, "failed to remove member")
		return
	}
	_ = s.projectCache.InvalidateAccess(r.Context(), userID)
	w.WriteHeader(http.StatusNoContent)
}

// ---- Audit ----------------------------------------------------------------

func (s *Server) handleListAudit(w http.ResponseWriter, r *http.Request) {
	limit := 200
	events, err := s.projectStore.ListAuditEvents(r.Context(), limit)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, "failed to load audit log")
		return
	}
	s.writeJSON(w, events)
}
