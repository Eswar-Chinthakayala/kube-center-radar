import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Users, Globe, ChevronRight } from 'lucide-react'
import { fetchJSON, useKCUser } from '../../api/client'

interface Project {
  id: string
  slug: string
  displayName: string
  description: string
  color: string
  memberCount: number
  members: Array<{ userId: string; role: string; user?: { email: string; name: string } }>
  namespaces: Array<{ clusterContext: string; namespace: string }>
}

function fetchProjects(): Promise<Project[]> {
  return fetchJSON('/admin/projects')
}

function ColorDot({ color }: { color: string }) {
  return <span className="w-3 h-3 rounded-full shrink-0 inline-block" style={{ background: color }} />
}

interface ProjectFormProps {
  initial?: Partial<Project>
  onSubmit: (data: { slug: string; displayName: string; description: string; color: string }) => void
  onCancel: () => void
  loading?: boolean
}

const PRESET_COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#ec4899','#06b6d4','#f97316']

function ProjectForm({ initial, onSubmit, onCancel, loading }: ProjectFormProps) {
  const [displayName, setDisplayName] = useState(initial?.displayName ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [color, setColor] = useState(initial?.color ?? '#3b82f6')

  function handleNameChange(v: string) {
    setDisplayName(v)
    if (!initial?.slug) {
      setSlug(v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-theme-text-tertiary uppercase tracking-wide font-medium">Display name *</label>
          <input
            className="w-full rounded-md border border-theme-border bg-theme-surface-2 px-3 py-1.5 text-sm text-theme-text-primary focus:outline-none focus:border-emerald-500"
            value={displayName}
            onChange={e => handleNameChange(e.target.value)}
            placeholder="Payments Team"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-theme-text-tertiary uppercase tracking-wide font-medium">Slug *</label>
          <input
            className="w-full rounded-md border border-theme-border bg-theme-surface-2 px-3 py-1.5 text-sm font-mono text-theme-text-primary focus:outline-none focus:border-emerald-500"
            value={slug}
            onChange={e => setSlug(e.target.value)}
            placeholder="payments-team"
            disabled={!!initial?.slug}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-theme-text-tertiary uppercase tracking-wide font-medium">Description</label>
        <input
          className="w-full rounded-md border border-theme-border bg-theme-surface-2 px-3 py-1.5 text-sm text-theme-text-primary focus:outline-none focus:border-emerald-500"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optional description"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-[11px] text-theme-text-tertiary uppercase tracking-wide font-medium">Color</label>
        <div className="flex gap-2">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-6 h-6 rounded-full border-2 transition-all"
              style={{ background: c, borderColor: c === color ? '#fff' : 'transparent' }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm text-theme-text-secondary hover:text-theme-text-primary rounded border border-theme-border">
          Cancel
        </button>
        <button
          onClick={() => onSubmit({ slug, displayName, description, color })}
          disabled={!displayName || !slug || loading}
          className="px-4 py-1.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded"
        >
          {loading ? 'Saving…' : initial ? 'Update' : 'Create project'}
        </button>
      </div>
    </div>
  )
}

export function ProjectsView({ onSelectProject }: { onSelectProject: (id: string) => void }) {
  const qc = useQueryClient()
  const { data: kcUser } = useKCUser()
  const isSuperAdmin = kcUser?.globalRole === 'super_admin'

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: fetchProjects,
  })

  const [showCreate, setShowCreate] = useState(false)

  const createMut = useMutation({
    mutationFn: (body: object) => fetchJSON('/admin/projects', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-projects'] }); setShowCreate(false) },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetchJSON(`/admin/projects/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-projects'] }),
  })

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-theme-text-primary">Projects</h2>
          <p className="text-xs text-theme-text-tertiary mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        {isSuperAdmin && !showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-md"
          >
            <Plus size={14} /> New project
          </button>
        )}
      </div>

      {showCreate && (
        <div className="border border-emerald-500/30 rounded-lg bg-theme-surface p-4">
          <h3 className="text-[13px] font-medium text-theme-text-primary mb-3">New project</h3>
          <ProjectForm
            onSubmit={d => createMut.mutate(d)}
            onCancel={() => setShowCreate(false)}
            loading={createMut.isPending}
          />
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-theme-text-tertiary">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="text-sm text-theme-text-tertiary">No projects yet.{isSuperAdmin ? ' Create one above.' : ''}</div>
      ) : (
        <div className="flex flex-col gap-2">
          {projects.map(p => (
            <div key={p.id} className="group flex items-center gap-3 px-4 py-3 bg-theme-surface border border-theme-border rounded-lg hover:border-theme-border-hover transition-colors cursor-pointer"
              onClick={() => onSelectProject(p.id)}>
              <ColorDot color={p.color} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-theme-text-primary">{p.displayName}</span>
                  <span className="text-[11px] font-mono text-theme-text-tertiary">{p.slug}</span>
                </div>
                {p.description && <p className="text-[12px] text-theme-text-tertiary truncate mt-0.5">{p.description}</p>}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-[11px] text-theme-text-tertiary">
                    <Users size={11} /> {p.memberCount ?? p.members?.length ?? 0} member{(p.memberCount ?? 0) !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-theme-text-tertiary">
                    <Globe size={11} /> {p.namespaces?.length ?? 0} namespace{(p.namespaces?.length ?? 0) !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                {isSuperAdmin && (
                  <button
                    onClick={() => { if (confirm(`Delete project "${p.displayName}"?`)) deleteMut.mutate(p.id) }}
                    className="p-1.5 rounded text-theme-text-tertiary hover:text-red-400 hover:bg-theme-hover"
                    title="Delete project"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <ChevronRight size={14} className="text-theme-text-tertiary shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
