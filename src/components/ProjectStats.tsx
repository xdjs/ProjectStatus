'use client'

import { ProjectData } from '@/types/github'
import { CheckCircle, Circle, Clock, GitPullRequest, AlertCircle } from 'lucide-react'

interface ProjectStatsProps {
  project: ProjectData
}

export function ProjectStats({ project }: ProjectStatsProps) {
  const stats = {
    total: project.items.length,
    open: project.items.filter(item => item.state === 'OPEN').length,
    closed: project.items.filter(item => item.state === 'CLOSED').length,
    merged: project.items.filter(item => item.state === 'MERGED').length,
    issues: project.items.filter(item => item.type === 'ISSUE').length,
    pullRequests: project.items.filter(item => item.type === 'PULL_REQUEST').length,
    drafts: project.items.filter(item => item.type === 'DRAFT_ISSUE').length,
  }

  const statItems = [
    {
      label: 'Total Items',
      value: stats.total,
      icon: Circle,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Open',
      value: stats.open,
      icon: Circle,
      color: 'text-green-500',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Closed',
      value: stats.closed,
      icon: CheckCircle,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50'
    },
    {
      label: 'Merged',
      value: stats.merged,
      icon: CheckCircle,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50'
    },
    {
      label: 'Issues',
      value: stats.issues,
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50'
    },
    {
      label: 'Pull Requests',
      value: stats.pullRequests,
      icon: GitPullRequest,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50'
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statItems.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.label}
            className="bg-card p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold mb-1">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </div>
        )
      })}
    </div>
  )
} 