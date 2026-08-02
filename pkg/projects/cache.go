package projects

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

const permTTL = 30 * time.Second

// Cache wraps Redis for session storage and permission caching.
type Cache struct {
	rdb *redis.Client
}

// NewCache connects to Redis and returns a ready Cache.
func NewCache(addr string) (*Cache, error) {
	rdb := redis.NewClient(&redis.Options{Addr: addr})
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("projects: redis ping: %w", err)
	}
	return &Cache{rdb: rdb}, nil
}

func (c *Cache) Close() error { return c.rdb.Close() }

// ---- Session --------------------------------------------------------------

func (c *Cache) SetSession(ctx context.Context, token string, userID uuid.UUID, ttl time.Duration) error {
	return c.rdb.Set(ctx, "session:"+token, userID.String(), ttl).Err()
}

func (c *Cache) GetSession(ctx context.Context, token string) (uuid.UUID, bool, error) {
	val, err := c.rdb.Get(ctx, "session:"+token).Result()
	if err == redis.Nil {
		return uuid.UUID{}, false, nil
	}
	if err != nil {
		return uuid.UUID{}, false, err
	}
	id, err := uuid.Parse(val)
	return id, true, err
}

func (c *Cache) DeleteSession(ctx context.Context, token string) error {
	return c.rdb.Del(ctx, "session:"+token).Err()
}

// ---- Permission cache -----------------------------------------------------

type cachedAccess struct {
	GlobalRole GlobalRole             `json:"globalRole"`
	AllowedNS  map[string]ProjectRole `json:"allowedNS"`
}

func (c *Cache) GetAccess(ctx context.Context, userID uuid.UUID) (*UserAccess, bool, error) {
	val, err := c.rdb.Get(ctx, permKey(userID)).Result()
	if err == redis.Nil {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	var ca cachedAccess
	if err := json.Unmarshal([]byte(val), &ca); err != nil {
		return nil, false, err
	}
	return &UserAccess{
		UserID:     userID,
		GlobalRole: ca.GlobalRole,
		allowedNS:  ca.AllowedNS,
	}, true, nil
}

func (c *Cache) SetAccess(ctx context.Context, access *UserAccess) error {
	ca := cachedAccess{
		GlobalRole: access.GlobalRole,
		AllowedNS:  access.allowedNS,
	}
	b, err := json.Marshal(ca)
	if err != nil {
		return err
	}
	return c.rdb.Set(ctx, permKey(access.UserID), b, permTTL).Err()
}

// InvalidateAccess drops the cached permission set so the next request recomputes it from Postgres.
func (c *Cache) InvalidateAccess(ctx context.Context, userID uuid.UUID) error {
	return c.rdb.Del(ctx, permKey(userID)).Err()
}

func (c *Cache) InvalidateAccessByProject(ctx context.Context, projectID uuid.UUID, store *Store) error {
	// Load all members of this project and invalidate each one.
	members, err := store.db.QueryxContext(ctx,
		`SELECT user_id FROM project_members WHERE project_id=$1`, projectID)
	if err != nil {
		return err
	}
	defer members.Close()
	for members.Next() {
		var uid uuid.UUID
		if err := members.Scan(&uid); err != nil {
			return err
		}
		_ = c.rdb.Del(ctx, permKey(uid))
	}
	return members.Err()
}

func permKey(userID uuid.UUID) string {
	return "perm:" + userID.String()
}

// Get resolves a user's access by email, using Redis as a cache and Postgres as the source.
// Returns (nil, nil) when the user is not found in Postgres (i.e. has never logged in).
func (c *Cache) Get(ctx context.Context, email string, store *Store) (*UserAccess, error) {
	user, err := store.GetUserByEmail(ctx, email)
	if err != nil || user == nil {
		return nil, err
	}
	if access, ok, err := c.GetAccess(ctx, user.ID); err == nil && ok {
		return access, nil
	}
	// Cache miss — compute from Postgres and populate the cache.
	access, err := store.ResolveAccess(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	_ = c.SetAccess(ctx, access)
	return access, nil
}
