import { useQuery } from '@tanstack/react-query'
import { Server, Activity, AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'
import { fetchJSON, useTopNodeMetrics } from '../../api/client'
import type { SelectedResource } from '../../types'

interface NodeCondition {
  type: string
  status: string
  reason: string
  message: string
}

interface NodeResource {
  metadata: {
    name: string
    creationTimestamp: string
    labels: Record<string, string>
  }
  status: {
    capacity: Record<string, string>
    allocatable: Record<string, string>
    conditions: NodeCondition[]
    nodeInfo: {
      kubeletVersion: string
      osImage: string
      architecture: string
      operatingSystem: string
    }
  }
}

interface NodesViewProps {
  namespaces: string[]
  onResourceClick?: (resource: SelectedResource) => void
}

export function NodesView({ onResourceClick }: NodesViewProps) {
  // Fetch raw Kubernetes Node resources
  const { data: nodes, isLoading, error } = useQuery<NodeResource[]>({
    queryKey: ['resources', 'nodes', '', []], // empty namespace for cluster-scoped
    queryFn: () => fetchJSON('/resources/nodes'),
    staleTime: 30000,
    refetchInterval: 60000,
  })

  // Fetch live metrics for nodes (CPU/Memory)
  const { data: metrics } = useTopNodeMetrics()

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col h-full bg-theme-base items-center justify-center">
        <Activity className="w-8 h-8 text-theme-text-tertiary animate-pulse mb-4" />
        <div className="text-theme-text-secondary text-sm">Loading nodes...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col h-full bg-theme-base items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-danger mb-4" />
        <div className="text-danger font-medium">Failed to load nodes</div>
        <div className="text-theme-text-secondary text-sm mt-2">{(error as Error).message}</div>
      </div>
    )
  }

  const nodeList = nodes || []

  return (
    <div className="flex-1 flex flex-col h-full bg-theme-base overflow-hidden">
      {/* Header */}
      <header className="shrink-0 px-6 py-4 border-b border-theme-border flex items-center justify-between bg-theme-surface">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-skyhook-500/10 border border-skyhook-500/20 flex items-center justify-center">
            <Server className="w-5 h-5 text-skyhook-600 dark:text-skyhook-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-theme-text-primary tracking-tight">Cluster Nodes</h1>
            <p className="text-sm text-theme-text-tertiary mt-0.5">Physical and virtual machines powering the cluster.</p>
          </div>
        </div>
        <div className="text-sm text-theme-text-secondary">
          <span className="font-semibold text-theme-text-primary">{nodeList.length}</span> nodes found
        </div>
      </header>

      {/* Main content - Table */}
      <main className="flex-1 overflow-auto p-6 bg-theme-base">
        <div className="rounded-lg border border-theme-border bg-theme-surface shadow-sm overflow-hidden">
          
          {/* Table Header */}
          <div className="grid grid-cols-[minmax(250px,1fr)_120px_160px_160px_minmax(150px,1fr)_100px] gap-4 px-5 py-3 border-b border-theme-border text-xs font-semibold text-theme-text-secondary uppercase tracking-wider bg-theme-hover/50">
            <div>Node Name</div>
            <div>Status</div>
            <div>CPU Usage</div>
            <div>Memory Usage</div>
            <div>OS / Arch</div>
            <div className="text-right">Version</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-theme-border">
            {nodeList.length === 0 ? (
              <div className="px-5 py-8 text-center text-theme-text-tertiary text-sm">
                No nodes available in this cluster.
              </div>
            ) : (
              nodeList.map((node) => {
                const readyCondition = node.status.conditions?.find(c => c.type === 'Ready')
                const isReady = readyCondition?.status === 'True'
                const metric = metrics?.find(m => m.name === node.metadata.name)
                
                // Format Metrics
                let cpuPct = 0
                let memPct = 0
                if (metric) {
                  cpuPct = metric.cpuAllocatable > 0 ? (metric.cpu / metric.cpuAllocatable) * 100 : 0
                  memPct = metric.memoryAllocatable > 0 ? (metric.memory / metric.memoryAllocatable) * 100 : 0
                }

                return (
                  <div 
                    key={node.metadata.name}
                    className="grid grid-cols-[minmax(250px,1fr)_120px_160px_160px_minmax(150px,1fr)_100px] gap-4 px-5 py-3 items-center hover:bg-theme-hover transition-colors group cursor-pointer"
                    onClick={() => onResourceClick?.({
                      kind: 'nodes',
                      name: node.metadata.name,
                      namespace: '',
                      group: ''
                    })}
                  >
                    {/* Node Name */}
                    <div className="truncate font-medium text-theme-text-primary group-hover:text-skyhook-600 dark:group-hover:text-skyhook-400 transition-colors">
                      {node.metadata.name}
                    </div>

                    {/* Status */}
                    <div>
                      <span className={clsx(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border",
                        isReady 
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" 
                          : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
                      )}>
                        {isReady ? 'Ready' : 'Not Ready'}
                      </span>
                    </div>

                    {/* CPU Usage */}
                    <div className="flex flex-col gap-1 pr-4">
                      <div className="flex items-center justify-between text-[11px] text-theme-text-secondary">
                        <span>{metric ? `${cpuPct.toFixed(0)}%` : '--'}</span>
                        <span>{metric ? `${(metric.cpu).toFixed(2)} cores` : ''}</span>
                      </div>
                      <div className="h-1.5 bg-theme-border rounded-full overflow-hidden">
                        <div 
                          className={clsx(
                            "h-full rounded-full transition-all duration-500",
                            cpuPct > 85 ? "bg-red-500" : cpuPct > 70 ? "bg-amber-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${Math.min(cpuPct, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Memory Usage */}
                    <div className="flex flex-col gap-1 pr-4">
                      <div className="flex items-center justify-between text-[11px] text-theme-text-secondary">
                        <span>{metric ? `${memPct.toFixed(0)}%` : '--'}</span>
                        <span>{metric ? `${(metric.memory / 1024 / 1024 / 1024).toFixed(1)}GB` : ''}</span>
                      </div>
                      <div className="h-1.5 bg-theme-border rounded-full overflow-hidden">
                        <div 
                          className={clsx(
                            "h-full rounded-full transition-all duration-500",
                            memPct > 85 ? "bg-red-500" : memPct > 70 ? "bg-amber-500" : "bg-sky-500"
                          )}
                          style={{ width: `${Math.min(memPct, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* OS / Arch */}
                    <div className="text-[13px] text-theme-text-secondary truncate">
                      {node.status.nodeInfo.osImage} <span className="text-theme-text-quaternary mx-1">•</span> {node.status.nodeInfo.architecture}
                    </div>

                    {/* Version */}
                    <div className="text-[13px] text-theme-text-secondary text-right truncate">
                      {node.status.nodeInfo.kubeletVersion}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
