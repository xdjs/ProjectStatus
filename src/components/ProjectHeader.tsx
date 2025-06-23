'use client'

import { ProjectData } from '@/types/github'
import { ExternalLink, Calendar, Eye, EyeOff } from 'lucide-react'

interface ProjectHeaderProps {
  project: ProjectData
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="bg-card p-6 rounded-lg border shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h2 className="text-xl font-semibold">{project.title}</h2>
            <span className="text-sm text-muted-foreground">#{project.number}</span>
            <div className="flex items-center space-x-1">
              {project.public ? (
                <>
                  <Eye className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-green-500">Public</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 text-orange-500" />
                  <span className="text-xs text-orange-500">Private</span>
                </>
              )}
            </div>
          </div>

          {project.description && (
            <p className="text-muted-foreground mb-3">{project.description}</p>
          )}

          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>Created {formatDate(project.createdAt)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>Updated {formatDate(project.updatedAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            <ExternalLink className="w-4 h-4" />
            <span>View on GitHub</span>
          </a>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center space-x-2">
          <img
            src={project.owner.avatarUrl}
            alt={project.owner.login}
            className="w-6 h-6 rounded-full"
          />
          <span className="text-sm font-medium">{project.owner.login}</span>
          <span className="text-sm text-muted-foreground">/</span>
          <a
            href={project.repository.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline"
          >
            {project.repository.name}
          </a>
        </div>

        <div className="text-sm text-muted-foreground">
          {project.items.length} items
        </div>
      </div>
    </div>
  )
} 