import { Cpu, MemoryStick } from 'lucide-react'

interface MetricsBarsProps {
  cpuMilli?: number | null    // millicores usage
  memoryMi?: number | null    // MiB usage
  cpuRequest?: number | null  // nanocores request (optional, for utilization bar)
  memoryRequest?: number | null // bytes request
  size?: 'sm' | 'md'
  className?: string
}

function fmtCPU(milli: number): string {
  if (milli >= 1000) return `${(milli / 1000).toFixed(2)}c`
  return `${milli}m`
}

function fmtMem(mi: number): string {
  if (mi >= 1024) return `${(mi / 1024).toFixed(1)}Gi`
  return `${mi}Mi`
}

function UtilBar({ used, total, color }: { used: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0
  const barColor = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : color
  return (
    <div className="h-1 w-12 rounded-full bg-theme-surface-2 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function MetricsBars({ cpuMilli, memoryMi, cpuRequest, memoryRequest, size = 'md', className = '' }: MetricsBarsProps) {
  if (cpuMilli == null && memoryMi == null) return null

  const textSize = size === 'sm' ? 'text-[10px]' : 'text-[11px]'
  const iconSize = size === 'sm' ? 12 : 13

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {cpuMilli != null && (
        <div className="flex items-center gap-1.5">
          <Cpu size={iconSize} className="text-theme-text-tertiary shrink-0" />
          <div className="flex flex-col gap-0.5">
            <span className={`${textSize} font-mono text-theme-text-secondary tabular-nums`}>{fmtCPU(cpuMilli)}</span>
            {cpuRequest != null && cpuRequest > 0 && (
              <UtilBar used={cpuMilli} total={cpuRequest / 1_000_000} color="bg-blue-500" />
            )}
          </div>
        </div>
      )}
      {memoryMi != null && (
        <div className="flex items-center gap-1.5">
          <MemoryStick size={iconSize} className="text-theme-text-tertiary shrink-0" />
          <div className="flex flex-col gap-0.5">
            <span className={`${textSize} font-mono text-theme-text-secondary tabular-nums`}>{fmtMem(memoryMi)}</span>
            {memoryRequest != null && memoryRequest > 0 && (
              <UtilBar used={memoryMi} total={memoryRequest / (1024 * 1024)} color="bg-emerald-500" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Inline compact version for table cells — no icons, just numbers
export function MetricsCell({ cpuMilli, memoryMi }: { cpuMilli?: number | null; memoryMi?: number | null }) {
  if (cpuMilli == null && memoryMi == null) {
    return <span className="text-[11px] text-theme-text-tertiary font-mono">—</span>
  }
  return (
    <div className="flex items-center gap-2 font-mono text-[11px] text-theme-text-secondary tabular-nums">
      {cpuMilli != null && <span className="text-blue-400">{fmtCPU(cpuMilli)}</span>}
      {memoryMi != null && <span className="text-emerald-400">{fmtMem(memoryMi)}</span>}
    </div>
  )
}
