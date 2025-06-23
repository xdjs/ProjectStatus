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
    <div className="space-y-2 lg:space-y-4 h-screen flex flex-col">
      {/* Compact header with refresh - optimized for TV viewing */}
      <div className="flex items-center justify-between px-2 lg:px-0 py-2 lg:py-0">
        <div className="flex items-center space-x-2 lg:space-x-4">
          <h1 className="text-lg lg:text-xl xl:text-2xl font-semibold">{projectData.title}</h1>
          {loading && (
            <div className="flex items-center text-muted-foreground">
              <RefreshCw className="w-3 h-3 lg:w-4 lg:h-4 animate-spin mr-1 lg:mr-2" />
              <span className="text-xs lg:text-sm">Syncing...</span>
            </div>
          )}
          {error && (
            <div className="flex items-center text-destructive">
              <AlertCircle className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
              <span className="text-xs lg:text-sm">Sync error</span>
            </div>
          )}
        </div>
        
        <button
          onClick={onReconfigure}
          className="flex items-center space-x-1 lg:space-x-2 px-2 lg:px-3 py-1 lg:py-2 text-xs lg:text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
        >
          <RefreshCw className="w-3 h-3 lg:w-4 lg:h-4" />
          <span className="hidden lg:inline">Refresh</span>
        </button>
      </div>

      {/* Project Board Only - takes full remaining height */}
      <div className="flex-1 overflow-hidden">
        <ProjectBoard project={projectData} />
      </div>
    </div>
  )
} 