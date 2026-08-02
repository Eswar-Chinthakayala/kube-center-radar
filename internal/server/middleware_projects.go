package server

import (
	"context"
	"net/http"

	"github.com/google/uuid"
	pkgauth "github.com/skyhook-io/radar/pkg/auth"
	"github.com/skyhook-io/radar/pkg/projects"
)

type contextKey int

const (
	ctxUserAccess contextKey = iota
	ctxUserID
)

// projectsMiddleware resolves the calling user's project access and attaches it
// to the request context. Requires that auth middleware has already set a user
// identity (email) on the context.
//
// When projects are not configured (Store == nil), the middleware is a no-op
// and all existing Radar behavior is preserved.
func (s *Server) projectsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if s.projectStore == nil {
			next.ServeHTTP(w, r)
			return
		}

		authUser := pkgauth.UserFromContext(r.Context())
		var email string
		if authUser != nil {
			email = authUser.Username // OIDC usernames are typically emails in KC
		}
		if email == "" {
			next.ServeHTTP(w, r)
			return
		}

		user, err := s.projectStore.GetUserByEmail(r.Context(), email)
		if err != nil || user == nil {
			// Unknown user — treat as unauthenticated; let downstream handlers decide.
			next.ServeHTTP(w, r)
			return
		}

		access, hit, err := s.projectCache.GetAccess(r.Context(), user.ID)
		if err != nil || !hit {
			access, err = s.projectStore.ResolveAccess(r.Context(), user.ID)
			if err != nil {
				s.writeError(w, http.StatusInternalServerError, "permission resolution failed")
				return
			}
			_ = s.projectCache.SetAccess(r.Context(), access)
		}

		ctx := context.WithValue(r.Context(), ctxUserAccess, access)
		ctx = context.WithValue(ctx, ctxUserID, user.ID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// accessFromCtx returns the UserAccess attached by projectsMiddleware.
// Returns nil when projects are not configured.
func accessFromCtx(r *http.Request) *projects.UserAccess {
	v, _ := r.Context().Value(ctxUserAccess).(*projects.UserAccess)
	return v
}

func userIDFromCtx(r *http.Request) (uuid.UUID, bool) {
	v, ok := r.Context().Value(ctxUserID).(uuid.UUID)
	return v, ok
}

// requireSuperAdmin returns 403 unless the caller is a Super Admin.
func (s *Server) requireSuperAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		a := accessFromCtx(r)
		if a == nil || !a.IsSuperAdmin() {
			s.writeError(w, http.StatusForbidden, "super admin required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// requireProjectAdmin returns 403 unless the caller is a Super Admin or a
// Project Admin of at least one project.
func (s *Server) requireProjectAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		a := accessFromCtx(r)
		if a == nil {
			s.writeError(w, http.StatusForbidden, "authentication required")
			return
		}
		if a.IsSuperAdmin() || a.CanManageMembers(uuid.UUID{}) {
			next.ServeHTTP(w, r)
			return
		}
		s.writeError(w, http.StatusForbidden, "project admin required")
	})
}
