import { LayoutDashboard, Users, FolderKanban, ClipboardList, ShieldCheck } from 'lucide-react'
import { useKCUser } from '../../api/client'

export type AdminTab = 'overview' | 'projects' | 'users' | 'audit'

interface AdminLayoutProps {
  activeTab: AdminTab
  onTabChange: (tab: AdminTab) => void
  children: React.ReactNode
}

export function AdminLayout({ activeTab, onTabChange, children }: AdminLayoutProps) {
  const { data: kcUser } = useKCUser()
  const isSuperAdmin = kcUser?.globalRole === 'super_admin'

  const navItems: Array<{ id: AdminTab; label: string; icon: React.ReactNode; superAdminOnly?: boolean }> = [
    { id: 'overview',  label: 'Overview',  icon: <LayoutDashboard size={15} /> },
    { id: 'projects',  label: 'Projects',  icon: <FolderKanban size={15} /> },
    { id: 'users',     label: 'Users',     icon: <Users size={15} />,           superAdminOnly: true },
    { id: 'audit',     label: 'Audit Log', icon: <ClipboardList size={15} />,   superAdminOnly: true },
  ]

  const visibleItems = navItems.filter(item => !item.superAdminOnly || isSuperAdmin)

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <aside className="w-48 shrink-0 flex flex-col border-r border-theme-border bg-theme-surface">
        <div className="px-4 py-4 border-b border-theme-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-500/15 flex items-center justify-center">
              <ShieldCheck size={13} className="text-emerald-400" />
            </div>
            <span className="text-[13px] font-semibold text-theme-text-primary">Administration</span>
          </div>
          <p className="text-[11px] text-theme-text-tertiary mt-1 ml-8">
            {isSuperAdmin ? 'Super Admin' : 'Project Admin'}
          </p>
        </div>

        <nav className="flex flex-col gap-0.5 p-2 flex-1">
          {visibleItems.map(item => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors text-left w-full ${
                activeTab === item.id
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-theme-text-tertiary hover:text-theme-text-secondary hover:bg-theme-hover'
              }`}
            >
              <span className={activeTab === item.id ? 'text-emerald-400' : 'text-theme-text-tertiary'}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6 bg-theme-base">
        {children}
      </main>
    </div>
  )
}
