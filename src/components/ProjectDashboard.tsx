'use client'

import { ProjectData } from '@/types/github'
import { ProjectBoard } from './ProjectBoard'

interface ProjectDashboardProps {
  projectData: ProjectData | null
  loading: boolean
  error: string | null
  onReconfigure: () => void
}

export function ProjectDashboard({ 
  projectData, 
  loading, 
  error, 
  onReconfigure 
}: ProjectDashboardProps) {
  if (!projectData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No project data available</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Project Board - takes full height */}
      <div className="flex-1 overflow-hidden">
        <ProjectBoard project={projectData} />
      </div>
    </div>
  )
} 