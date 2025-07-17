/**
 * Data Transformation utilities for GitHub Projects V2
 * 
 * This module provides utilities for transforming and filtering GitHub Projects V2 data
 * for multi-project dashboard display. It handles normalization of project data,
 * filtering by TODO columns, and adding project metadata.
 */

import { ProjectConfig, ProjectData, ProjectItem } from '@/types/github'

/**
 * Transforms a project item from GitHub API format to our internal format
 */
export function transformProjectItem(item: any): ProjectItem {
  const content = item.content
  const baseItem = {
    id: item.id,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    projectFields: item.fieldValues?.nodes?.map((fv: any) => ({
      name: fv.field?.name || 'Unknown',
      value: fv.text || fv.number?.toString() || fv.name || fv.date || null
    })) || []
  }

  // Debug logging for field values
  if (content?.title) {
    console.log(`Issue "${content.title}" field values:`, baseItem.projectFields)
  }

  // Handle draft issues (no content)
  if (!content) {
    return {
      ...baseItem,
      title: 'Draft Item',
      body: '',
      url: '',
      state: 'OPEN',
      type: 'DRAFT_ISSUE',
      assignees: [],
      labels: [],
      author: { login: 'Unknown', avatarUrl: '', url: '' }
    }
  }

  // Handle regular issues and pull requests
  return {
    ...baseItem,
    title: content.title || 'Untitled',
    body: content.body || '',
    url: content.url || '',
    state: content.state || 'OPEN',
    type: item.type === 'PULL_REQUEST' ? 'PULL_REQUEST' : 
          content.state !== undefined ? 'ISSUE' : 'DRAFT_ISSUE',
    closedAt: content.closedAt,
    mergedAt: content.mergedAt,
    assignees: content.assignees?.nodes || [],
    labels: content.labels?.nodes || [],
    author: content.author || content.creator || { login: 'Unknown', avatarUrl: '', url: '' },
    milestone: content.milestone
  }
}

/**
 * Filters project items by TODO columns specified in project configuration
 */
export function filterItemsByTodoColumns(items: ProjectItem[], todoColumns: string[]): ProjectItem[] {
  if (!todoColumns || todoColumns.length === 0) {
    return items
  }

  return items.filter(item => {
    // Check if any of the item's project fields match the TODO columns
    return item.projectFields.some(field => {
      // Common field names that represent status/column
      const statusFieldNames = ['Status', 'Column', 'State', 'Phase', 'Stage']
      
      if (statusFieldNames.includes(field.name) && field.value) {
        return todoColumns.includes(field.value)
      }
      
      return false
    })
  })
}

/**
 * Normalizes project data structure and adds metadata
 */
export function transformProject(project: any, config: ProjectConfig): ProjectData {
  // Transform all project items
  const allItems = project.items?.nodes?.map(transformProjectItem) || []
  
  // Filter items by TODO columns for this project
  const filteredItems = filterItemsByTodoColumns(allItems, config.todoColumns)
  
  return {
    id: project.id,
    number: project.number,
    title: project.title,
    description: project.shortDescription,
    url: project.url,
    shortDescription: project.shortDescription,
    readme: project.readme,
    state: project.closed ? 'CLOSED' : 'OPEN',
    public: project.public,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    lastFetched: new Date().toISOString(),
    owner: project.owner,
    repository: {
      name: config.repo,
      fullName: `${config.owner}/${config.repo}`,
      url: `https://github.com/${config.owner}/${config.repo}`,
      description: project.items?.nodes?.[0]?.content?.repository?.description || ''
    },
    items: filteredItems,
    // Multi-project specific fields
    projectName: config.name,
    projectConfig: config
  }
}

/**
 * Groups project items by their status/column field
 */
export function groupItemsByStatus(items: ProjectItem[]): Record<string, ProjectItem[]> {
  const groups: Record<string, ProjectItem[]> = {}
  
  items.forEach(item => {
    // Find the status field (could be named differently per project)
    const statusField = item.projectFields.find(field => 
      ['Status', 'Column', 'State', 'Phase', 'Stage'].includes(field.name)
    )
    
    const status = statusField?.value || 'No Status'
    
    if (!groups[status]) {
      groups[status] = []
    }
    
    groups[status].push(item)
  })
  
  return groups
}

/**
 * Calculates project statistics for display
 */
export function calculateProjectStats(project: ProjectData): {
  totalItems: number
  todoItems: number
  inProgressItems: number
  completedItems: number
  openIssues: number
  pullRequests: number
} {
  const items = project.items
  
  // Count by status
  const statusGroups = groupItemsByStatus(items)
  const todoItems = (statusGroups['TODO'] || []).length + 
                   (statusGroups['Backlog'] || []).length +
                   (statusGroups['To Do'] || []).length
  
  const inProgressItems = (statusGroups['In Progress'] || []).length +
                         (statusGroups['Doing'] || []).length +
                         (statusGroups['Active'] || []).length
  
  const completedItems = (statusGroups['Done'] || []).length +
                        (statusGroups['Complete'] || []).length +
                        (statusGroups['Completed'] || []).length
  
  // Count by type
  const openIssues = items.filter(item => 
    item.type === 'ISSUE' && item.state === 'OPEN'
  ).length
  
  const pullRequests = items.filter(item => 
    item.type === 'PULL_REQUEST'
  ).length
  
  return {
    totalItems: items.length,
    todoItems,
    inProgressItems,
    completedItems,
    openIssues,
    pullRequests
  }
}

/**
 * Validates project data structure
 */
export function validateProjectData(project: any): boolean {
  return !!(
    project &&
    project.id &&
    project.number &&
    project.title &&
    project.owner &&
    Array.isArray(project.items?.nodes)
  )
}

/**
 * Sanitizes project data by removing sensitive information
 */
export function sanitizeProjectData(project: ProjectData): ProjectData {
  return {
    ...project,
    items: project.items.map(item => ({
      ...item,
      // Remove potentially sensitive body content for public display
      body: item.body ? item.body.substring(0, 200) + (item.body.length > 200 ? '...' : '') : '',
      // Keep only essential project fields
      projectFields: item.projectFields.filter(field => 
        ['Status', 'Priority', 'Assignee', 'Labels'].includes(field.name)
      )
    }))
  }
}

/**
 * Merges multiple project configurations with default values
 */
export function normalizeProjectConfigs(configs: ProjectConfig[]): ProjectConfig[] {
  return configs.map(config => {
    const repo = config.repo || 'unknown-repo'
    return {
      ...config,
      todoColumns: config.todoColumns || ['TODO'],
      name: config.name || `${config.owner}/${repo}`,
      repo
    }
  })
}

/**
 * Transforms error information for consistent display
 */
export function transformProjectError(error: any, projectName: string): {
  projectName: string
  error: string
  timestamp: string
} {
  return {
    projectName,
    error: error.message || 'Unknown error',
    timestamp: new Date().toISOString()
  }
}

/**
 * Sorts projects by priority (name, update time, etc.)
 */
export function sortProjects(projects: ProjectData[], sortBy: 'name' | 'updated' | 'items' = 'name'): ProjectData[] {
  return [...projects].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.projectName?.localeCompare(b.projectName || '') || 0
      case 'updated':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      case 'items':
        return b.items.length - a.items.length
      default:
        return 0
    }
  })
}

/**
 * Filters projects by search term
 */
export function searchProjects(projects: ProjectData[], searchTerm: string): ProjectData[] {
  if (!searchTerm.trim()) {
    return projects
  }
  
  const term = searchTerm.toLowerCase()
  
  return projects.filter(project => 
    project.title.toLowerCase().includes(term) ||
    project.projectName?.toLowerCase().includes(term) ||
    project.description?.toLowerCase().includes(term) ||
    project.items.some(item => 
      item.title.toLowerCase().includes(term) ||
      item.body?.toLowerCase().includes(term)
    )
  )
}