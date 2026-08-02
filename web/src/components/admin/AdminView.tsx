import { useState } from 'react'
import { AdminLayout } from './AdminLayout'
import { ProjectsView } from './ProjectsView'
import { ProjectDetail } from './ProjectDetail'
import { UsersView } from './UsersView'
import { AuditLogView } from './AuditLogView'

type AdminTab = 'projects' | 'users' | 'audit'

export function AdminView() {
  const [tab, setTab] = useState<AdminTab>('projects')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  function handleTabChange(t: AdminTab) {
    setTab(t)
    setSelectedProjectId(null)
  }

  return (
    <AdminLayout activeTab={tab} onTabChange={handleTabChange}>
      {tab === 'projects' && (
        selectedProjectId
          ? <ProjectDetail projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />
          : <ProjectsView onSelectProject={setSelectedProjectId} />
      )}
      {tab === 'users' && <UsersView />}
      {tab === 'audit' && <AuditLogView />}
    </AdminLayout>
  )
}
