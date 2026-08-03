import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Search, Clock, Plus, Check } from 'lucide-react'
import { fetchJSON } from '../../api/client'

interface KCUser {
  id: string
  email: string
  name: string
  globalRole: 'super_admin' | 'member'
  lastSeenAt: string | null
  createdAt: string
  projectCount?: number
}

interface Project {
  id: string
  displayName: string
}

function fetchUsers(): Promise<KCUser[]> {
  return fetchJSON('/admin/users')
}

function fetchProjects(): Promise<Project[]> {
  return fetchJSON('/admin/projects')
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

function AssignProjectButton({ user, projects }: { user: KCUser; projects: Project[] }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [assigned, setAssigned] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const assignMut = useMutation({
    mutationFn: ({ projectId }: { projectId: string }) =>
      fetchJSON(`/admin/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: user.email, role: 'member' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      setAssigned(true)
      setOpen(false)
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  if (projects.length === 0) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded border transition-colors ${
          assigned
            ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/8'
            : 'border-dashed border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10'
        }`}
      >
        {assigned ? <Check size={11} /> : <Plus size={11} />}
        {assigned ? 'Assigned' : 'Assign project'}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-theme-elevated border border-theme-border rounded-lg shadow-theme-md overflow-hidden">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-theme-text-tertiary uppercase tracking-wide border-b border-theme-border">
            Add to project as member
          </div>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => assignMut.mutate({ projectId: p.id })}
              disabled={assignMut.isPending}
              className="w-full text-left px-3 py-2.5 text-[12px] text-theme-text-secondary hover:bg-theme-hover hover:text-theme-text-primary transition-colors flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-500/50" />
              {p.displayName}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function UsersView() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchUsers,
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: fetchProjects,
  })

  const promoteMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      fetchJSON(`/admin/users/${id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ globalRole: role }),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const pendingCount = users.filter(u => u.globalRole !== 'super_admin' && !u.projectCount).length

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-theme-text-primary">Users</h2>
          <p className="text-xs text-theme-text-tertiary mt-0.5">{users.length} registered user{users.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5">
          <Clock size={14} className="text-amber-400 shrink-0" />
          <span className="text-[13px] text-amber-300">
            <strong>{pendingCount}</strong> user{pendingCount !== 1 ? 's are' : ' is'} awaiting project assignment
          </span>
        </div>
      )}

      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-tertiary" />
        <input
          className="w-full pl-8 pr-3 py-1.5 rounded-md border border-theme-border bg-theme-surface text-sm text-theme-text-primary placeholder:text-theme-text-tertiary focus:outline-none focus:border-emerald-500"
          placeholder="Search by email or name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="text-sm text-theme-text-tertiary">Loading…</div>
      ) : (
        <div className="flex flex-col gap-1">
          {filtered.map(u => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3 bg-theme-surface border border-theme-border rounded-lg">
              <div className="w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center text-[13px] font-semibold text-emerald-400 shrink-0">
                {(u.name || u.email).slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-medium text-theme-text-primary truncate">{u.name || u.email}</span>
                  {u.globalRole === 'super_admin' && (
                    <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded shrink-0">
                      <ShieldCheck size={10} /> Super Admin
                    </span>
                  )}
                  {u.globalRole !== 'super_admin' && !u.projectCount && (
                    <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded shrink-0">
                      <Clock size={10} /> Pending
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-theme-text-tertiary truncate">{u.email}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] text-theme-text-tertiary">{relTime(u.lastSeenAt)}</span>
                {u.globalRole !== 'super_admin' && !u.projectCount && (
                  <AssignProjectButton user={u} projects={projects} />
                )}
                <select
                  value={u.globalRole}
                  onChange={e => promoteMut.mutate({ id: u.id, role: e.target.value })}
                  className="text-[11px] bg-theme-surface-2 border border-theme-border rounded px-2 py-1 text-theme-text-secondary focus:outline-none focus:border-emerald-500"
                >
                  <option value="member">Member</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-sm text-theme-text-tertiary text-center py-6">No users found.</div>
          )}
        </div>
      )}
    </div>
  )
}
