-- Bootstrap super admin — always present on every fresh install.
-- ON CONFLICT DO NOTHING means re-running migrations is safe.
INSERT INTO users (id, email, name, global_role, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@kubecenter.local',
  'Super Admin',
  'super_admin',
  NOW()
)
ON CONFLICT (email) DO UPDATE
  SET global_role = 'super_admin';
