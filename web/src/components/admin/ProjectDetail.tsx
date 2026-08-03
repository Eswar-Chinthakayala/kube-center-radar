import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2, UserMinus, Globe, ChevronDown } from 'lucide-react'
import { fetchJSON, useKCUser } from '../../api/client'

interface Member {
  userId: string
  role: 'project_admin' | 'member' | 'viewer'
  addedAt: string
  user?: { email: string; name: string }
}

interface Namespace {
  clusterContext: string
  namespace: string
}

interface ProjectDetails {
  id: string
  slug: string
  displayName: string
  description: string
  color: string
  members: Member[]
  namespaces: Namespace[]
}

const ROLE_LABELS: Record<string, string> = {
  project_admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

export function ProjectDetail({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const qc = useQueryClient()
  const { data: kcUser } = useKCUser()
  const isSuperAdmin = kcUser?.globalRole === 'super_admin'

  const { data: project, isLoading } = useQuery<ProjectDetails>({
    queryKey: ['admin-project', projectId],
    queryFn: () => fetchJSON(`/admin/projects/${projectId}`),
  })

  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState<'project_admin' | 'member' | 'viewer'>('member')
  const [nsInput, setNsInput] = useState('')
  const [nsCtx, setNsCtx] = useState('')
  const [addMemberErr, setAddMemberErr] = useState('')

  const { data: clusterNamespaces = [] } = useQuery<string[]>({
    queryKey: ['namespaces'],
    queryFn: () => fetchJSON('/namespaces'),
    enabled: isSuperAdmin,
    staleTime: 60_000,
  })

  const addMemberMut = useMutation({
    mutationFn: () => fetchJSON(`/admin/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email: addEmail, role: addRole }),
      headers: { 'Content-Type': 'application/json' },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-project', projectId] })
      setAddEmail('')
      setAddMemberErr('')
    },
    onError: async (err: any) => {
      setAddMemberErr(err?.message ?? 'Failed to add member')
    },
  })

  const updateRoleMut = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      fetchJSON(`/admin/projects/${projectId}/members/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-project', projectId] }),
  })

  const removeMemberMut = useMutation({
    mutationFn: (userId: string) =>
      fetchJSON(`/admin/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-project', projectId] }),
  })

  const addNsMut = useMutation({
    mutationFn: () => fetchJSON(`/admin/projects/${projectId}/namespaces`, {
      method: 'POST',
      body: JSON.stringify({ clusterContext: nsCtx, namespace: nsInput }),
      headers: { 'Content-Type': 'application/json' },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-project', projectId] })
      setNsInput('')
      setNsCtx('')
    },
  })

  const removeNsMut = useMutation({
    mutationFn: ({ clusterContext, namespace }: Namespace) =>
      fetchJSON(`/admin/projects/${projectId}/namespaces`, {
        method: 'DELETE',
        body: JSON.stringify({ clusterContext, namespace }),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-project', projectId] }),
  })

  if (isLoading) return <div className="text-sm text-theme-text-tertiary">Loading…</div>
  if (!project) return <div className="text-sm text-theme-text-tertiary">Project not found.</div>

  const canManageMembers = isSuperAdmin || kcUser?.projects?.some(p => p.id === projectId && p.role === 'project_admin')

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded hover:bg-theme-hover text-theme-text-tertiary hover:text-theme-text-primary transition-colors">
          <ArrowLeft size={16} />
        </button>
        <span className="w-3 h-3 rounded-full shrink-0 inline-block" style={{ background: project.color }} />
        <div>
          <h2 className="text-sm font-semibold text-theme-text-primary">{project.displayName}</h2>
          {project.description && <p className="text-[11px] text-theme-text-tertiary">{project.description}</p>}
        </div>
      </div>

      {/* Members */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[12px] font-semibold text-theme-text-secondary uppercase tracking-wide">
            Members ({project.members.length})
          </h3>
        </div>

        {canManageMembers && (
          <div className="flex flex-col gap-2 p-3 bg-theme-surface border border-theme-border rounded-lg">
            <div className="flex gap-2">
              <input
                className="flex-1 rounded border border-theme-border bg-theme-surface-2 px-3 py-1.5 text-sm text-theme-text-primary placeholder:text-theme-text-tertiary focus:outline-none focus:border-emerald-500"
                placeholder="user@example.com"
                value={addEmail}
                onChange={e => { setAddEmail(e.target.value); setAddMemberErr('') }}
              />
              <select
                value={addRole}
                onChange={e => setAddRole(e.target.value as typeof addRole)}
                className="bg-theme-surface-2 border border-theme-border rounded px-2 py-1.5 text-sm text-theme-text-secondary focus:outline-none focus:border-emerald-500"
              >
                {isSuperAdmin && <option value="project_admin">Admin</option>}
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                onClick={() => addMemberMut.mutate()}
                disabled={!addEmail || addMemberMut.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded"
              >
                <Plus size={13} /> Add
              </button>
            </div>
            {addMemberErr && <p className="text-[11px] text-red-400">{addMemberErr}</p>}
          </div>
        )}

        <div className="flex flex-col gap-1">
          {project.members.map(m => (
            <div key={m.userId} className="flex items-center gap-3 px-3 py-2.5 bg-theme-surface border border-theme-border rounded-lg">
              <div className="w-7 h-7 rounded-full bg-emerald-600/20 flex items-center justify-center text-[12px] font-semibold text-emerald-400 shrink-0">
                {(m.user?.name || m.user?.email || '?').slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-theme-text-primary truncate">{m.user?.name || m.user?.email || m.userId}</div>
                {m.user?.email && m.user?.name && (
                  <div className="text-[11px] text-theme-text-tertiary truncate">{m.user.email}</div>
                )}
              </div>
              {canManageMembers ? (
                <select
                  value={m.role}
                  onChange={e => updateRoleMut.mutate({ userId: m.userId, role: e.target.value })}
                  className="text-[11px] bg-theme-surface-2 border border-theme-border rounded px-2 py-1 text-theme-text-secondary focus:outline-none"
                >
                  {isSuperAdmin && <option value="project_admin">Admin</option>}
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              ) : (
                <span className="text-[11px] text-theme-text-tertiary">{ROLE_LABELS[m.role]}</span>
              )}
              {canManageMembers && (
                <button
                  onClick={() => removeMemberMut.mutate(m.userId)}
                  className="p-1.5 rounded text-theme-text-tertiary hover:text-red-400 hover:bg-theme-hover"
                  title="Remove member"
                >
                  <UserMinus size={13} />
                </button>
              )}
            </div>
          ))}
          {project.members.length === 0 && (
            <div className="text-sm text-theme-text-tertiary text-center py-4">No members yet.</div>
          )}
        </div>
      </section>

      {/* Namespaces — super admin only */}
      {isSuperAdmin && (
        <section className="flex flex-col gap-3">
          <h3 className="text-[12px] font-semibold text-theme-text-secondary uppercase tracking-wide">
            Namespaces ({project.namespaces.length})
          </h3>

          <div className="flex gap-2 items-end">
            <div className="flex flex-col gap-1 flex-1 relative">
              <label className="text-[10px] text-theme-text-tertiary uppercase tracking-wide">Namespace</label>
              <div className="relative">
                <input
                  list="ns-suggestions"
                  className="w-full rounded border border-theme-border bg-theme-surface-2 px-3 py-1.5 pr-7 text-sm text-theme-text-primary focus:outline-none focus:border-emerald-500"
                  placeholder="production"
                  value={nsInput}
                  onChange={e => setNsInput(e.target.value)}
                />
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-text-tertiary pointer-events-none" />
              </div>
              {clusterNamespaces.length > 0 && (
                <datalist id="ns-suggestions">
                  {clusterNamespaces.map(ns => (
                    <option key={ns} value={ns} />
                  ))}
                </datalist>
              )}
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[10px] text-theme-text-tertiary uppercase tracking-wide">Cluster context</label>
              <input
                className="rounded border border-theme-border bg-theme-surface-2 px-3 py-1.5 text-sm text-theme-text-primary focus:outline-none focus:border-emerald-500"
                placeholder="my-cluster (or *)"
                value={nsCtx}
                onChange={e => setNsCtx(e.target.value)}
              />
            </div>
            <button
              onClick={() => addNsMut.mutate()}
              disabled={!nsInput || addNsMut.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded"
            >
              <Plus size={13} /> Add
            </button>
          </div>

          <div className="flex flex-col gap-1">
            {project.namespaces.map(ns => (
              <div key={`${ns.clusterContext}/${ns.namespace}`} className="flex items-center gap-3 px-3 py-2 bg-theme-surface border border-theme-border rounded">
                <Globe size={13} className="text-theme-text-tertiary shrink-0" />
                <span className="flex-1 text-[13px] font-mono text-theme-text-primary">{ns.namespace}</span>
                <span className="text-[11px] text-theme-text-tertiary font-mono">{ns.clusterContext}</span>
                <button
                  onClick={() => removeNsMut.mutate(ns)}
                  className="p-1.5 rounded text-theme-text-tertiary hover:text-red-400 hover:bg-theme-hover"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {project.namespaces.length === 0 && (
              <div className="text-sm text-theme-text-tertiary text-center py-3">No namespaces assigned.</div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
