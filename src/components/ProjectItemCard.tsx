'use client'

import { ProjectItem } from '@/types/github'
import { ExternalLink, User, Tag, AlertCircle, GitPullRequest } from 'lucide-react'

interface ProjectItemCardProps {
  item: ProjectItem
}

export function ProjectItemCard({ item }: ProjectItemCardProps) {
  const getItemIcon = () => {
    switch (item.type) {
      case 'ISSUE':
        return <AlertCircle className="w-4 h-4" />
      case 'PULL_REQUEST':
        return <GitPullRequest className="w-4 h-4" />
      case 'DRAFT_ISSUE':
        return <AlertCircle className="w-4 h-4 opacity-50" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  const getStateColor = () => {
    switch (item.state) {
      case 'OPEN':
        return 'text-green-500'
      case 'CLOSED':
        return 'text-purple-500'
      case 'MERGED':
        return 'text-blue-500'
      default:
        return 'text-gray-500'
    }
  }

  return (
    <div className="bg-background border rounded-lg p-2 lg:p-3 xl:p-4 hover:shadow-md transition-shadow cursor-pointer text-xs lg:text-sm">
      <div className="flex items-start justify-between mb-2 lg:mb-3">
        <div className="flex items-center space-x-1 lg:space-x-2">
          <div className={getStateColor()}>
            {getItemIcon()}
          </div>
          <span className="text-xs text-muted-foreground uppercase tracking-wide hidden lg:inline">
            {item.type.replace('_', ' ')}
          </span>
        </div>
        
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-primary"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3 lg:w-4 lg:h-4" />
        </a>
      </div>

      <h5 className="font-medium text-xs lg:text-sm mb-2 lg:mb-3 line-clamp-2">
        {item.title}
      </h5>

      {/* Labels */}
      {item.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2 lg:mb-3">
          {item.labels.slice(0, 2).map((label) => (
            <span
              key={label.name}
              className="inline-flex items-center px-1 lg:px-2 py-0.5 lg:py-1 text-xs rounded-full"
              style={{
                backgroundColor: `#${label.color}20`,
                color: `#${label.color}`,
                borderColor: `#${label.color}40`,
                borderWidth: '1px'
              }}
            >
              <Tag className="w-2 h-2 lg:w-3 lg:h-3 mr-0.5 lg:mr-1" />
              <span className="hidden lg:inline">{label.name}</span>
              <span className="lg:hidden">{label.name.substring(0, 3)}</span>
            </span>
          ))}
          {item.labels.length > 2 && (
            <span className="text-xs text-muted-foreground">
              +{item.labels.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Assignees */}
      {item.assignees.length > 0 && (
        <div className="flex items-center space-x-1 lg:space-x-2">
          <User className="w-2 h-2 lg:w-3 lg:h-3 text-muted-foreground" />
          <div className="flex -space-x-1">
            {item.assignees.slice(0, 3).map((assignee) => (
              <img
                key={assignee.login}
                src={assignee.avatarUrl}
                alt={assignee.login}
                className="w-4 h-4 lg:w-5 lg:h-5 rounded-full border-2 border-background"
                title={assignee.login}
              />
            ))}
            {item.assignees.length > 3 && (
              <div className="w-4 h-4 lg:w-5 lg:h-5 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                <span className="text-xs text-muted-foreground">
                  +{item.assignees.length - 3}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 