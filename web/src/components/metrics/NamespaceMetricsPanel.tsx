import { useTopNamespaceMetrics, useTopWorkloadMetrics } from '../../api/client'
import { MetricsBars } from './MetricsBars'
import { Cpu, MemoryStick, Box } from 'lucide-react'

interface Props {
  namespace: string
}

export function NamespaceMetricsPanel({ namespace }: Props) {
  const { data: nsData } = useTopNamespaceMetrics()
  const { data: wlData } = useTopWorkloadMetrics({ namespace })

  const ns = nsData?.namespaces?.find(n => n.namespace === namespace)

  if (!nsData?.metricsAvailable && !wlData?.metricsAvailable) {
    return (
      <div className="text-[12px] text-theme-text-tertiary">
        Metrics not available — install metrics-server in this cluster.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Namespace aggregate */}
      {ns && (
        <div className="flex flex-wrap gap-4">
          <StatCard icon={<Cpu size={14} />} label="CPU" value={`${ns.cpuMilli}m`} color="text-blue-400" />
          <StatCard icon={<MemoryStick size={14} />} label="Memory" value={fmtMem(ns.memoryMi)} color="text-emerald-400" />
          <StatCard icon={<Box size={14} />} label="Pods" value={String(ns.podCount)} color="text-theme-text-secondary" />
        </div>
      )}

      {/* Top workloads table */}
      {wlData?.workloads && wlData.workloads.length > 0 && (
        <div>
          <div className="text-[11px] font-medium text-theme-text-tertiary uppercase tracking-wide mb-2">
            Workload metrics
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-theme-border text-theme-text-tertiary">
                  <th className="text-left pb-1.5 pr-4 font-medium">Workload</th>
                  <th className="text-left pb-1.5 pr-4 font-medium">Pods</th>
                  <th className="text-left pb-1.5 pr-4 font-medium">CPU</th>
                  <th className="text-left pb-1.5 font-medium">Memory</th>
                </tr>
              </thead>
              <tbody>
                {wlData.workloads.map(wl => (
                  <tr key={`${wl.kind}/${wl.name}`} className="border-b border-theme-border last:border-0">
                    <td className="py-1.5 pr-4">
                      <span className="text-theme-text-secondary">{wl.name}</span>
                      <span className="ml-1.5 text-[10px] text-theme-text-tertiary">{wl.kind}</span>
                    </td>
                    <td className="py-1.5 pr-4 font-mono text-theme-text-tertiary">
                      {wl.readyPods}/{wl.pods}
                    </td>
                    <td className="py-1.5 pr-4 font-mono text-blue-400">{wl.cpuMilli != null ? `${wl.cpuMilli}m` : '—'}</td>
                    <td className="py-1.5 font-mono text-emerald-400">{wl.memoryMi != null ? fmtMem(wl.memoryMi) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2 bg-theme-surface rounded-lg border border-theme-border px-3 py-2 min-w-[90px]">
      <span className={`${color} shrink-0`}>{icon}</span>
      <div>
        <div className="text-[10px] text-theme-text-tertiary uppercase tracking-wide">{label}</div>
        <div className={`text-[13px] font-mono font-semibold ${color}`}>{value}</div>
      </div>
    </div>
  )
}

function fmtMem(mi: number): string {
  if (mi >= 1024) return `${(mi / 1024).toFixed(1)}Gi`
  return `${mi}Mi`
}

// Inline summary for the namespace list table
export function NamespaceMetricsSummary({ namespace }: Props) {
  const { data } = useTopNamespaceMetrics()
  const ns = data?.namespaces?.find(n => n.namespace === namespace)
  if (!ns) return <span className="text-[11px] text-theme-text-tertiary font-mono">—</span>
  return <MetricsBars cpuMilli={ns.cpuMilli} memoryMi={ns.memoryMi} size="sm" />
}
