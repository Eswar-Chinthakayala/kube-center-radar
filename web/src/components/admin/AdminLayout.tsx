import { Users, FolderKanban, ClipboardList } from 'lucide-react'
import { useKCUser } from '../../api/client'

type AdminTab = 'projects' | 'users' | 'audit'

interface AdminLayoutProps {
  activeTab: AdminTab
  onTabChange: (tab: AdminTab) => void
  children: React.ReactNode
}

export function AdminLayout({ activeTab, onTabChange, children }: AdminLayoutProps) {
  const { data: kcUser } = useKCUser()

  const tabs: Array<{ id: AdminTab; label: string; icon: React.ReactNode; superAdminOnly?: boolean }> = [
    { id: 'projects', label: 'Projects', icon: <FolderKanban size={15} /> },
    { id: 'users',    label: 'Users',    icon: <Users size={15} />,           superAdminOnly: true },
    { id: 'audit',    label: 'Audit Log', icon: <ClipboardList size={15} />, superAdminOnly: true },
  ]

  const isSuperAdmin = kcUser?.globalRole === 'super_admin'
  const visibleTabs = tabs.filter(t => !t.superAdminOnly || isSuperAdmin)

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-theme-border shrink-0">
        <h1 className="text-base font-semibold text-theme-text-primary tracking-tight">Administration</h1>
        <div className="h-4 w-px bg-theme-border" />
        <span className="text-sm text-theme-text-tertiary">
          {isSuperAdmin ? 'Super Admin' : 'Project Admin'}
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-6 pt-3 pb-0 border-b border-theme-border shrink-0">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-t border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'text-theme-text-primary border-emerald-500'
                : 'text-theme-text-tertiary border-transparent hover:text-theme-text-secondary hover:bg-theme-hover'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  )
}
