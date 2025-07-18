'use client'

import React from 'react'
import { MultiProjectData, ProjectData } from '@/types/github'
import { ProjectSection } from './ProjectSection'

interface MultiProjectDashboardProps {
  multiProjectData: MultiProjectData | null
  loading: boolean
  error: string | null
  onReconfigure: () => void
}

export function MultiProjectDashboard({ 
  multiProjectData, 
  loading, 
  error, 
  onReconfigure 
}: MultiProjectDashboardProps) {
  console.log('MultiProjectDashboard render:', {
    hasData: !!multiProjectData,
    projectCount: multiProjectData?.projects?.length || 0,
    errorCount: multiProjectData?.errors?.length || 0
  })

  if (!multiProjectData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No project data available</p>
      </div>
    )
  }

  const { projects, errors } = multiProjectData

  if (projects.length === 0 && errors.length > 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4">Failed to Load Projects</h2>
        <div className="space-y-2 max-w-md mx-auto">
          {errors.map((error, index) => (
            <div key={index} className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <p className="font-medium text-destructive">{error.projectName}</p>
              <p className="text-sm text-destructive/80">{error.error}</p>
            </div>
          ))}
        </div>
        <button
          onClick={onReconfigure}
          className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with stats */}
      <div className="bg-card border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Multi-Project Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {projects.length} project{projects.length !== 1 ? 's' : ''} loaded
              {errors.length > 0 && ` • ${errors.length} error${errors.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <div className="text-center">
              <div className="font-semibold">{getTotalTodoItems(projects)}</div>
              <div className="text-muted-foreground">TODO Items</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">{getTotalInProgressItems(projects)}</div>
              <div className="text-muted-foreground">In Progress</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">{getTotalCompletedItems(projects)}</div>
              <div className="text-muted-foreground">Completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Error notifications */}
      {errors.length > 0 && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-6 py-3 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="text-destructive font-medium">⚠️ Some projects failed to load:</div>
            <div className="text-sm text-destructive/80">
              {errors.map(e => e.projectName).join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Projects grid - allows scrolling */}
      <div className="flex-1 overflow-auto">
        <ProjectsGrid projects={projects} />
      </div>
    </div>
  )
}

function ProjectsGrid({ projects }: { projects: ProjectData[] }) {
  console.log('ProjectsGrid render:', {
    totalProjects: projects.length,
    projectNames: projects.map(p => p.projectName || p.title)
  })

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No projects to display</p>
      </div>
    )
  }

  // For single project, use full height
  if (projects.length === 1) {
    return (
      <div className="h-full p-6">
        <ProjectSection project={projects[0]} />
      </div>
    )
  }

  // For multiple projects, use horizontal grid layout
  // Adjust columns based on project count: 2-3 projects = 2-3 cols, 4+ projects = 3 cols with wrapping
  const gridCols = Math.min(projects.length, 3) // Max 3 columns
  const gridStyle = { gridTemplateColumns: `repeat(${gridCols}, 1fr)` }

  return (
    <div className="p-6">
      <div className="grid gap-6" style={gridStyle}>
        {projects.map((project, index) => {
          console.log(`Rendering project ${index + 1}:`, project.projectName || project.title)
          return (
            <div key={project.id} className="min-h-[400px]">
              <ProjectSection project={project} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getTotalTodoItems(projects: ProjectData[]): number {
  return projects.reduce((total, project) => {
    return total + project.items.filter(item => {
      const statusField = item.projectFields.find(field => 
        ['Status', 'Column', 'State', 'Phase', 'Stage'].includes(field.name)
      )
      const status = statusField?.value || ''
      return ['TODO', 'Backlog', 'To Do'].includes(status)
    }).length
  }, 0)
}

function getTotalInProgressItems(projects: ProjectData[]): number {
  return projects.reduce((total, project) => {
    return total + project.items.filter(item => {
      const statusField = item.projectFields.find(field => 
        ['Status', 'Column', 'State', 'Phase', 'Stage'].includes(field.name)
      )
      const status = statusField?.value || ''
      return ['In Progress', 'Doing', 'Active'].includes(status)
    }).length
  }, 0)
}

function getTotalCompletedItems(projects: ProjectData[]): number {
  return projects.reduce((total, project) => {
    return total + project.items.filter(item => {
      const statusField = item.projectFields.find(field => 
        ['Status', 'Column', 'State', 'Phase', 'Stage'].includes(field.name)
      )
      const status = statusField?.value || ''
      return ['Done', 'Complete', 'Completed'].includes(status)
    }).length
  }, 0)
}