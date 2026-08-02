import { useMemo, useState, useRef, forwardRef } from 'react'
import { AlertTriangle, Plus, Upload, X } from 'lucide-react'
import {
  ClusterSwitcher,
  type ClusterSwitcherItem,
  pluralize,
} from '@skyhook-io/k8s-ui'
import { useContexts, useSwitchContext, useClusterInfo, fetchSessionCounts, useImportKubeconfig, type SessionCounts } from '../api/client'
import { useContextSwitch } from '../context/ContextSwitchContext'
import { useToast } from '../components/ui/Toast'
import { useDock } from '../components/dock'
import type { ContextInfo } from '../types'
import { parseContextName, type ParsedContextName } from '../utils/context-name'

interface ContextSwitcherProps {
  className?: string
  variant?: 'chip' | 'segment'
  label?: string
  triggerName?: string
}

export interface ContextSwitcherHandle {
  open: () => void
}

interface ParsedContext extends ParsedContextName {
  context: ContextInfo
}

function shouldSuppressSwitchErrorToast(error: unknown): boolean {
  const message = error instanceof Error ? error.message : ''
  return message.includes('cluster connection failed:')
}

export const ContextSwitcher = forwardRef<ContextSwitcherHandle, ContextSwitcherProps>(({ className = '', variant, label, triggerName }, ref) => {
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingSwitch, setPendingSwitch] = useState<ParsedContext | null>(null)
  const [sessionCounts, setSessionCounts] = useState<SessionCounts | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importYaml, setImportYaml] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: contexts, isLoading: contextsLoading } = useContexts()
  const { data: clusterInfo } = useClusterInfo()
  const switchContext = useSwitchContext()
  const importKubeconfig = useImportKubeconfig()
  const { startSwitch, endSwitch } = useContextSwitch()
  const { showError, showSuccess } = useToast()
  const { tabs } = useDock()

  // Parse contexts and decide whether to render group headers (multi-account only).
  // hasMultipleSources gates the kubeconfig-source chip — only useful when 2+
  // distinct kubeconfig files are in play. Single-source setups (the common
  // case) skip the chip entirely so the dropdown stays clean.
  const { parsedById, hasMultipleAccounts, hasMultipleSources } = useMemo(() => {
    if (!contexts) return {
      parsedById: new Map<string, ParsedContext>(),
      hasMultipleAccounts: false,
      hasMultipleSources: false,
    }
    // Strip the disambiguation suffix (" (<source>)" or " (<source> #N)")
    // before parsing — qualified names won't match the GKE/EKS/AKS regexes
    // otherwise, and the suffix is redundant with the source chip we
    // render separately.
    const stripSourceSuffix = (name: string, source?: string): string => {
      if (!source) return name
      const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return name.replace(new RegExp(`\\s+\\(${escaped}(?:\\s+#\\d+)?\\)$`), '')
    }
    const parsed: ParsedContext[] = contexts.map(ctx => ({
      context: ctx,
      ...parseContextName(stripSourceSuffix(ctx.name, ctx.source)),
    }))
    const accounts = new Set(parsed.map(p => `${p.provider}:${p.account}`))
    const sources = new Set(contexts.map(c => c.source).filter(Boolean))
    const byId = new Map<string, ParsedContext>()
    for (const p of parsed) byId.set(p.context.name, p)
    return {
      parsedById: byId,
      hasMultipleAccounts: accounts.size > 1,
      hasMultipleSources: sources.size > 1,
    }
  }, [contexts])

  // Map parsed contexts → generic ClusterSwitcher items, sorted GKE/EKS/AKS/Other → account → name.
  const items = useMemo<ClusterSwitcherItem[]>(() => {
    const order: Record<string, number> = { GKE: 0, EKS: 1, AKS: 2 }
    const arr = Array.from(parsedById.values())
    arr.sort((a, b) => {
      const oa = order[a.provider || ''] ?? 3
      const ob = order[b.provider || ''] ?? 3
      if (oa !== ob) return oa - ob
      const acc = (a.account || '').localeCompare(b.account || '')
      if (acc !== 0) return acc
      return a.clusterName.localeCompare(b.clusterName)
    })
    return arr.map(p => {
      const groupKey = `${p.provider || 'other'}:${p.account || 'default'}`
      const groupLabel = hasMultipleAccounts && p.provider
        ? `${p.provider}${p.account ? ` · ${p.account}` : ''}`
        : hasMultipleAccounts
          ? 'Other'
          : undefined
      return {
        id: p.context.name,
        name: p.raw,
        secondary: p.provider ? p.raw : undefined,
        badge: p.region || undefined,
        sourceLabel: hasMultipleSources ? p.context.source : undefined,
        group: { key: groupKey, label: groupLabel },
      }
    })
  }, [parsedById, hasMultipleAccounts, hasMultipleSources])

  const performSwitch = async (parsed: ParsedContext) => {
    startSwitch({
      raw: parsed.raw,
      provider: parsed.provider,
      account: parsed.account,
      region: parsed.region,
      clusterName: parsed.clusterName,
    })
    try {
      await switchContext.mutateAsync({ name: parsed.context.name })
    } catch (error) {
      console.error('Failed to switch context:', error)
      endSwitch()
      // Backend may not transition to StateDisconnected on client-side errors
      // (network, timeout) — without this toast the user gets no feedback.
      if (!shouldSuppressSwitchErrorToast(error)) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        showError('Failed to switch context', message)
      }
    }
  }

  const handleSelect = async (item: ClusterSwitcherItem) => {
    const parsed = parsedById.get(item.id)
    if (!parsed || parsed.context.isCurrent || switchContext.isPending) return

    // Active sessions (port forwards from API + terminal tabs from dock) get
    // a confirmation prompt — switching contexts kills both.
    try {
      const counts = await fetchSessionCounts()
      const terminalTabs = tabs.filter(t => t.type === 'terminal').length
      const total = counts.portForwards + terminalTabs
      if (total > 0) {
        setSessionCounts({ ...counts, execSessions: terminalTabs, total })
        setPendingSwitch(parsed)
        setShowConfirm(true)
        return
      }
    } catch (error) {
      // Session-counts is best-effort; failing it shouldn't block the user.
      // But warn — if there ARE active sessions we couldn't see, the switch
      // will silently kill them.
      console.error('Failed to check sessions:', error)
      showError(
        'Could not check active sessions',
        'Switching anyway. Any open port-forwards or terminals will be terminated.',
      )
    }
    performSwitch(parsed)
  }

  const handleConfirmSwitch = () => {
    setShowConfirm(false)
    if (pendingSwitch) {
      performSwitch(pendingSwitch)
      setPendingSwitch(null)
    }
  }

  const handleCancelSwitch = () => {
    setShowConfirm(false)
    setPendingSwitch(null)
    setSessionCounts(null)
  }

  const handleImportSubmit = async () => {
    if (!importYaml.trim()) return
    try {
      const result = await importKubeconfig.mutateAsync(importYaml.trim())
      setShowImport(false)
      setImportYaml('')
      if (result.count === 0) {
        showError('No new contexts', 'All contexts in the kubeconfig already exist.')
      } else {
        showSuccess(
          `Added ${result.count} context${result.count !== 1 ? 's' : ''}`,
          result.added.join(', '),
        )
      }
    } catch (err) {
      showError('Import failed', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setImportYaml((ev.target?.result as string) || '')
    reader.readAsText(file)
    e.target.value = ''
  }

  // In-cluster mode renders a static badge instead of a switcher (only one
  // synthetic context, no kubeconfig to choose from).
  const isInClusterMode = contexts?.length === 1 && contexts[0].name === 'in-cluster'
  if (isInClusterMode) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="px-2 py-1 bg-theme-elevated rounded text-sm font-medium text-blue-300">
          in-cluster
        </span>
      </div>
    )
  }

  const currentCtx = contexts?.find(c => c.isCurrent)
  const currentId = currentCtx?.name
  // Use parsed.raw (the source-stripped form) for the trigger so the
  // disambiguation suffix doesn't double up with the source chip.
  // Fall back to clusterInfo.context for the very-early window before
  // /api/contexts has resolved.
  const currentParsed = currentId ? parsedById.get(currentId) : undefined
  const currentRaw = triggerName || currentParsed?.raw || clusterInfo?.context || currentCtx?.name || 'Unknown'
  const currentSourceLabel = triggerName ? undefined : hasMultipleSources ? currentCtx?.source || undefined : undefined

  return (
    <>
      <ClusterSwitcher
        ref={ref}
        className={className}
        variant={variant}
        label={label}
        currentId={currentId}
        currentName={currentRaw}
        currentSourceLabel={currentSourceLabel}
        items={items}
        onSelect={handleSelect}
        loading={switchContext.isPending}
        disabled={contextsLoading}
        searchable={items.length > 1}
        showGroupHeaders={hasMultipleAccounts}
        errorSlot={
          switchContext.isError ? (
            <span className="text-xs text-red-400">{switchContext.error?.message}</span>
          ) : undefined
        }
        footerSlot={
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-hover transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add cluster
          </button>
        }
      />

      {showImport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-theme-surface border border-theme-border rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="px-4 py-3 border-b border-theme-border flex items-center justify-between">
              <span className="font-medium text-theme-text-primary">Add cluster via kubeconfig</span>
              <button
                type="button"
                onClick={() => { setShowImport(false); setImportYaml('') }}
                className="text-theme-text-tertiary hover:text-theme-text-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-4 space-y-3">
              <p className="text-sm text-theme-text-secondary">
                Paste a kubeconfig file or upload one. New contexts will be merged into your <code className="text-xs bg-theme-elevated px-1 py-0.5 rounded">~/.kube/config</code>.
              </p>
              <textarea
                className="w-full h-48 bg-theme-base border border-theme-border rounded text-xs font-mono text-theme-text-primary placeholder:text-theme-text-tertiary p-3 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] resize-none"
                placeholder="apiVersion: v1&#10;kind: Config&#10;clusters: ..."
                value={importYaml}
                onChange={e => setImportYaml(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-theme-elevated border border-theme-border text-theme-text-secondary hover:bg-theme-hover transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload file
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".yaml,.yml,.kubeconfig,*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-theme-border flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowImport(false); setImportYaml('') }}
                className="px-3 py-1.5 text-sm rounded-md bg-theme-elevated hover:bg-theme-hover text-theme-text-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={!importYaml.trim() || importKubeconfig.isPending}
                className="px-3 py-1.5 text-sm rounded-md btn-brand disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importKubeconfig.isPending ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && sessionCounts && pendingSwitch && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-theme-surface border border-theme-border rounded-lg shadow-xl max-w-md mx-4 overflow-hidden">
            <div className="px-4 py-3 border-b border-theme-border flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span className="font-medium text-theme-text-primary">Active Sessions</span>
            </div>
            <div className="px-4 py-4">
              <p className="text-sm text-theme-text-secondary mb-3">
                Switching contexts will terminate active sessions:
              </p>
              <ul className="text-sm text-theme-text-primary space-y-1 mb-4">
                {sessionCounts.portForwards > 0 && (
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    {pluralize(sessionCounts.portForwards, 'port forward')}
                  </li>
                )}
                {sessionCounts.execSessions > 0 && (
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    {pluralize(sessionCounts.execSessions, 'terminal session')}
                  </li>
                )}
              </ul>
              <p className="text-xs text-theme-text-tertiary">
                Switch to: <span className="text-theme-text-secondary">{pendingSwitch.clusterName}</span>
              </p>
            </div>
            <div className="px-4 py-3 border-t border-theme-border flex justify-end gap-2">
              <button
                onClick={handleCancelSwitch}
                className="px-3 py-1.5 text-sm rounded-md bg-theme-elevated hover:bg-theme-hover text-theme-text-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSwitch}
                className="px-3 py-1.5 text-sm rounded-md bg-amber-500 hover:bg-amber-600 text-white transition-colors"
              >
                Switch Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
})
