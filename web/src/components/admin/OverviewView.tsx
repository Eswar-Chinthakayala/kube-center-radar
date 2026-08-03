import { useQuery } from '@tanstack/react-query'
import { Users, FolderKanban, Globe, Clock, ShieldCheck, ChevronRight, ShieldAlert, Plus, UserCog, Folder, Trash2, User } from 'lucide-react'
import { fetchJSON, useKCUser } from '../../api/client'

interface StatsData {
  users: Array<{ id: string; email: string; name: string; globalRole: string; projectCount?: number; lastSeenAt: string | null }>
  projects: Array<{ id: string; displayName: string; color: string; members: unknown[]; namespaces: unknown[] }>
  audit: Array<{ id: string; action: string; resource_kind: string; resource_ref: Record<string, string> | null; occurred_at: string; actor_email: string | null }>
}

const ACTION_ICON: Record<string, React.ReactNode> = {
  create_project:   <Plus size={12} className="text-emerald-400" />,
  delete_project:   <Trash2 size={12} className="text-red-400" />,
  add_member:       <User size={12} className="text-blue-400" />,
  remove_member:    <User size={12} className="text-amber-400" />,
  set_role:         <UserCog size={12} className="text-purple-400" />,
  add_namespace:    <Folder size={12} className="text-sky-400" />,
  remove_namespace: <Folder size={12} className="text-orange-400" />,
}

const ACTION_LABEL: Record<string, string> = {
  create_project:   'Created project',
  delete_project:   'Deleted project',
  add_member:       'Added member',
  remove_member:    'Removed member',
  set_role:         'Changed role',
  add_namespace:    'Added namespace',
  remove_namespace: 'Removed namespace',
}

function relTime(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface OverviewViewProps {
  onNavigate: (tab: 'projects' | 'users' | 'audit') => void
}

export function OverviewView({ onNavigate }: OverviewViewProps) {
  const { data: kcUser } = useKCUser()
  const isSuperAdmin = kcUser?.globalRole === 'super_admin'

  const { data: users = [] } = useQuery<StatsData['users']>({
    queryKey: ['admin-users'],
    queryFn: () => fetchJSON('/admin/users'),
    enabled: isSuperAdmin,
  })

  const { data: projects = [] } = useQuery<StatsData['projects']>({
    queryKey: ['admin-projects'],
    queryFn: () => fetchJSON('/admin/projects'),
  })

  const { data: audit = [] } = useQuery<StatsData['audit']>({
    queryKey: ['admin-audit'],
    queryFn: () => fetchJSON('/admin/audit'),
    enabled: isSuperAdmin,
  })

  const pendingUsers = users.filter(u => u.globalRole !== 'super_admin' && !u.projectCount)
  const totalNamespaces = projects.reduce((acc, p) => acc + (p.namespaces?.length ?? 0), 0)
  const recentAudit = audit.slice(0, 5)

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h2 className="text-sm font-semibold text-theme-text-primary">Overview</h2>
        <p className="text-xs text-theme-text-tertiary mt-0.5">System summary at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {isSuperAdmin && (
          <>
            <button
              onClick={() => onNavigate('users')}
              className="flex flex-col gap-1.5 p-4 bg-theme-surface border border-theme-border rounded-xl hover:border-theme-border-hover hover:bg-theme-hover transition-colors text-left group"
            >
              <div className="flex items-center justify-between">
                <Users size={16} className="text-theme-text-tertiary group-hover:text-theme-text-secondary transition-colors" />
                {pendingUsers.length > 0 && (
                  <span className="text-[10px] font-semibold bg-amber-400/15 text-amber-400 px-1.5 py-0.5 rounded-full">
                    {pendingUsers.length} pending
                  </span>
                )}
              </div>
              <span className="text-2xl font-bold text-theme-text-primary tabular-nums">{users.length}</span>
              <span className="text-[11px] text-theme-text-tertiary">Total users</span>
            </button>

            <button
              onClick={() => onNavigate('users')}
              className={`flex flex-col gap-1.5 p-4 rounded-xl border text-left group transition-colors ${
                pendingUsers.length > 0
                  ? 'bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10'
                  : 'bg-theme-surface border-theme-border hover:bg-theme-hover hover:border-theme-border-hover'
              }`}
            >
              <Clock size={16} className={pendingUsers.length > 0 ? 'text-amber-400' : 'text-theme-text-tertiary group-hover:text-theme-text-secondary transition-colors'} />
              <span className={`text-2xl font-bold tabular-nums ${pendingUsers.length > 0 ? 'text-amber-400' : 'text-theme-text-primary'}`}>
                {pendingUsers.length}
              </span>
              <span className="text-[11px] text-theme-text-tertiary">Awaiting approval</span>
            </button>
          </>
        )}

        <button
          onClick={() => onNavigate('projects')}
          className="flex flex-col gap-1.5 p-4 bg-theme-surface border border-theme-border rounded-xl hover:border-theme-border-hover hover:bg-theme-hover transition-colors text-left group"
        >
          <FolderKanban size={16} className="text-theme-text-tertiary group-hover:text-theme-text-secondary transition-colors" />
          <span className="text-2xl font-bold text-theme-text-primary tabular-nums">{projects.length}</span>
          <span className="text-[11px] text-theme-text-tertiary">Projects</span>
        </button>

        <div className="flex flex-col gap-1.5 p-4 bg-theme-surface border border-theme-border rounded-xl">
          <Globe size={16} className="text-theme-text-tertiary" />
          <span className="text-2xl font-bold text-theme-text-primary tabular-nums">{totalNamespaces}</span>
          <span className="text-[11px] text-theme-text-tertiary">Namespaces mapped</span>
        </div>
      </div>

      {/* Pending approval callout */}
      {isSuperAdmin && pendingUsers.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <Clock size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-amber-300">
              {pendingUsers.length} user{pendingUsers.length !== 1 ? 's need' : ' needs'} project assignment
            </p>
            <p className="text-[12px] text-amber-400/70 mt-0.5">
              {pendingUsers.slice(0, 3).map(u => u.name || u.email).join(', ')}
              {pendingUsers.length > 3 ? ` +${pendingUsers.length - 3} more` : ''}
            </p>
          </div>
          <button
            onClick={() => onNavigate('users')}
            className="flex items-center gap-1 text-[12px] font-medium text-amber-400 hover:text-amber-300 shrink-0"
          >
            Review <ChevronRight size={13} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Projects list */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold text-theme-text-tertiary uppercase tracking-wide">Projects</h3>
            <button onClick={() => onNavigate('projects')} className="text-[11px] text-emerald-400 hover:text-emerald-300">
              View all
            </button>
          </div>
          {projects.length === 0 ? (
            <div className="text-[12px] text-theme-text-tertiary px-3 py-4 border border-theme-border border-dashed rounded-lg text-center">
              No projects yet
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {projects.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center gap-2.5 px-3 py-2.5 bg-theme-surface border border-theme-border rounded-lg">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                  <span className="flex-1 text-[13px] text-theme-text-primary truncate">{p.displayName}</span>
                  <span className="text-[11px] text-theme-text-tertiary shrink-0">
                    {p.members?.length ?? 0}m · {p.namespaces?.length ?? 0}ns
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent activity */}
        {isSuperAdmin && (
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold text-theme-text-tertiary uppercase tracking-wide">Recent activity</h3>
              <button onClick={() => onNavigate('audit')} className="text-[11px] text-emerald-400 hover:text-emerald-300">
                View all
              </button>
            </div>
            {recentAudit.length === 0 ? (
              <div className="text-[12px] text-theme-text-tertiary px-3 py-4 border border-theme-border border-dashed rounded-lg text-center">
                No activity yet
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-theme-border border border-theme-border rounded-lg overflow-hidden">
                {recentAudit.map(e => (
                  <div key={e.id} className="flex items-start gap-2.5 px-3 py-2.5 bg-theme-surface">
                    <div className="mt-0.5 w-4 h-4 flex items-center justify-center shrink-0">
                      {ACTION_ICON[e.action] ?? <ShieldAlert size={12} className="text-theme-text-tertiary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-theme-text-primary truncate">
                        {ACTION_LABEL[e.action] ?? e.action}
                      </p>
                      <p className="text-[10px] text-theme-text-tertiary truncate">{e.actor_email ?? 'system'}</p>
                    </div>
                    <span className="text-[10px] text-theme-text-tertiary shrink-0">{relTime(e.occurred_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* My projects (non super-admin) */}
        {!isSuperAdmin && kcUser?.projects && kcUser.projects.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-[11px] font-semibold text-theme-text-tertiary uppercase tracking-wide">Your role</h3>
            <div className="flex flex-col gap-1">
              {kcUser.projects.map(p => (
                <div key={p.id} className="flex items-center gap-2.5 px-3 py-2.5 bg-theme-surface border border-theme-border rounded-lg">
                  <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
                  <span className="flex-1 text-[13px] text-theme-text-primary">{p.displayName}</span>
                  <span className="text-[11px] text-theme-text-tertiary capitalize">{p.role?.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
