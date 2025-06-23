'use client'

import { ProjectData } from '@/types/github'
import { ProjectBoard } from './ProjectBoard'
import { RefreshCw, AlertCircle } from 'lucide-react'

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
    <div className="space-y-4">
      {/* Simple header with refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">{projectData.title}</h1>
          {loading && (
            <div className="flex items-center text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              <span className="text-sm">Syncing...</span>
            </div>
          )}
          {error && (
            <div className="flex items-center text-destructive">
              <AlertCircle className="w-4 h-4 mr-2" />
              <span className="text-sm">Sync error</span>
            </div>
          )}
        </div>
        
        <button
          onClick={onReconfigure}
          className="flex items-center space-x-2 px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Project Board Only */}
      <ProjectBoard project={projectData} />
    </div>
  )
} 