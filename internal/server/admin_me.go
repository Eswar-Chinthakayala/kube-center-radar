package server

import (
	"net/http"

	pkgauth "github.com/skyhook-io/radar/pkg/auth"
)

// handleAdminMe returns the current user's KC role and project memberships.
// Used by the frontend to decide which admin UI elements to show.
// Returns a minimal payload when projects are not configured.
func (s *Server) handleAdminMe(w http.ResponseWriter, r *http.Request) {
	if s.projectStore == nil {
		s.writeJSON(w, map[string]any{
			"projectsEnabled": false,
		})
		return
	}

	authUser := pkgauth.UserFromContext(r.Context())
	if authUser == nil {
		s.writeJSON(w, map[string]any{
			"projectsEnabled": true,
			"globalRole":      "member",
		})
		return
	}

	user, err := s.projectStore.GetUserByEmail(r.Context(), authUser.Username)
	if err != nil || user == nil {
		s.writeJSON(w, map[string]any{
			"projectsEnabled": true,
			"globalRole":      "member",
		})
		return
	}

	projects, err := s.projectStore.ListProjectsForUser(r.Context(), user.ID)
	if err != nil {
		projects = nil
	}

	s.writeJSON(w, map[string]any{
		"projectsEnabled": true,
		"userId":          user.ID,
		"email":           user.Email,
		"name":            user.Name,
		"globalRole":      string(user.GlobalRole),
		"projects":        projects,
	})
}
