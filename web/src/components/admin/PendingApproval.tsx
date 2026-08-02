import { Clock, Mail } from 'lucide-react'
import { useKCUser } from '../../api/client'

export function PendingApprovalScreen() {
  const { data: kcUser } = useKCUser()

  return (
    <div className="flex-1 flex items-center justify-center bg-theme-base">
      <div className="flex flex-col items-center gap-6 max-w-md text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Clock className="w-8 h-8 text-amber-400" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-theme-text-primary tracking-tight">
            Awaiting approval
          </h1>
          <p className="text-sm text-theme-text-secondary leading-relaxed">
            Your account has been created. A super admin needs to assign you to a project before you can access any cluster resources.
          </p>
        </div>

        {kcUser?.email && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-theme-surface border border-theme-border">
            <Mail size={14} className="text-theme-text-tertiary shrink-0" />
            <span className="text-[13px] text-theme-text-secondary font-mono">{kcUser.email}</span>
          </div>
        )}

        <div className="flex flex-col gap-2 w-full text-left bg-theme-surface border border-theme-border rounded-lg p-4">
          <p className="text-[11px] font-semibold text-theme-text-tertiary uppercase tracking-wide">What happens next</p>
          <ol className="flex flex-col gap-2">
            {[
              'Your admin receives a notification about your sign-up',
              'They review your request and assign you to a project',
              'You get access to your team\'s namespaces',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13px] text-theme-text-secondary">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="text-[13px] text-theme-text-tertiary hover:text-theme-text-secondary underline underline-offset-2"
        >
          Refresh to check status
        </button>
      </div>
    </div>
  )
}
