import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShieldAlert, User, Folder, Trash2, Plus, UserCog, RefreshCw } from 'lucide-react'
import { fetchJSON } from '../../api/client'

interface AuditEntry {
  id: string
  action: string
  resource_kind: string
  resource_ref: Record<string, string> | null
  occurred_at: string
  actor_email: string | null
}

function fetchAudit(): Promise<AuditEntry[]> {
  return fetchJSON('/admin/audit')
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const ACTION_ICON: Record<string, React.ReactNode> = {
  create_project: <Plus size={13} className="text-emerald-400" />,
  delete_project: <Trash2 size={13} className="text-red-400" />,
  add_member:    <User size={13} className="text-blue-400" />,
  remove_member: <User size={13} className="text-amber-400" />,
  set_role:      <UserCog size={13} className="text-purple-400" />,
  add_namespace: <Folder size={13} className="text-sky-400" />,
  remove_namespace: <Folder size={13} className="text-orange-400" />,
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

function refSummary(ref: Record<string, string> | null): string {
  if (!ref) return ''
  return ref.name || ref.slug || ref.email || ref.namespace || ref.id?.slice(0, 8) || ''
}

export function AuditLogView() {
  const [filter, setFilter] = useState('')

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: fetchAudit,
    refetchInterval: 30_000,
  })

  const filtered = entries.filter(e => {
    const q = filter.toLowerCase()
    return (
      e.actor_email?.toLowerCase().includes(q) ||
      e.action.includes(q) ||
      e.resource_kind.toLowerCase().includes(q) ||
      JSON.stringify(e.resource_ref).toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-theme-text-primary">Audit Log</h2>
          <p className="text-xs text-theme-text-tertiary mt-0.5">Last 200 admin actions</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs text-theme-text-tertiary hover:text-theme-text-secondary px-2 py-1 rounded hover:bg-theme-surface transition-colors"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <input
        className="w-full px-3 py-1.5 rounded-md border border-theme-border bg-theme-surface text-sm text-theme-text-primary placeholder:text-theme-text-tertiary focus:outline-none focus:border-emerald-500"
        placeholder="Filter by actor, action, or resource…"
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />

      {isLoading ? (
        <div className="text-sm text-theme-text-tertiary">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-theme-text-tertiary">
          <ShieldAlert size={28} className="opacity-30" />
          <span className="text-sm">{filter ? 'No matching entries.' : 'No audit events yet.'}</span>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-theme-border border border-theme-border rounded-lg overflow-hidden">
          {filtered.map(e => (
            <div key={e.id} className="flex items-start gap-3 px-4 py-3 bg-theme-surface hover:bg-theme-hover transition-colors">
              <div className="mt-0.5 w-5 h-5 flex items-center justify-center shrink-0">
                {ACTION_ICON[e.action] ?? <ShieldAlert size={13} className="text-theme-text-tertiary" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium text-theme-text-primary">
                    {ACTION_LABEL[e.action] ?? e.action}
                  </span>
                  {refSummary(e.resource_ref) && (
                    <span className="text-[12px] text-theme-text-secondary font-mono bg-theme-elevated px-1.5 py-0.5 rounded">
                      {refSummary(e.resource_ref)}
                    </span>
                  )}
                  <span className="text-[11px] text-theme-text-tertiary bg-theme-elevated px-1.5 py-0.5 rounded">
                    {e.resource_kind}
                  </span>
                </div>
                <div className="text-[11px] text-theme-text-tertiary mt-0.5">
                  {e.actor_email ?? 'system'}
                </div>
              </div>
              <span className="text-[11px] text-theme-text-tertiary shrink-0 mt-0.5">
                {relTime(e.occurred_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
