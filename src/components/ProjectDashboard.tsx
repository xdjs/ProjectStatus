'use client'

import { ProjectData } from '@/types/github'
import { ProjectBoard } from './ProjectBoard'
import { RefreshCw } from 'lucide-react'

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
      {/* Header with refresh button */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold">{projectData.title}</h1>
        <div className="flex items-center gap-2">
          {projectData.lastFetched && (
            <span className="text-sm text-muted-foreground">
              Last updated: {new Date(projectData.lastFetched).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={onReconfigure}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
      {/* Project Board - takes remaining height */}
      <div className="flex-1 overflow-hidden">
        <ProjectBoard project={projectData} />
      </div>
    </div>
  )
} 