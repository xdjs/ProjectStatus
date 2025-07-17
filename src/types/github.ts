// User/Author interface used across multiple types
interface GitHubUser {
  login: string
  avatarUrl: string
  url: string
}

// Label interface
interface Label {
  name: string
  color: string
  description?: string
}

export interface ProjectItem {
  id: string
  title: string
  body?: string
  url: string
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  type: 'ISSUE' | 'PULL_REQUEST' | 'DRAFT_ISSUE'
  assignees: GitHubUser[]
  labels: Label[]
  createdAt: string
  updatedAt: string
  closedAt?: string
  mergedAt?: string
  author: GitHubUser
  milestone?: {
    title: string
    description?: string
    dueOn?: string
    state: 'OPEN' | 'CLOSED'
  }
  projectFields: Array<{
    name: string
    value: string | null
  }>
}

export interface ProjectConfig {
  name: string
  owner: string
  repo: string
  projectNumber: number
  todoColumns: string[]
}

export interface ProjectData {
  id: string
  number: number
  title: string
  description?: string
  url: string
  state: 'OPEN' | 'CLOSED'
  public: boolean
  createdAt: string
  updatedAt: string
  lastFetched?: string
  owner: GitHubUser
  repository: {
    name: string
    fullName: string
    url: string
    description?: string
  }
  items: ProjectItem[]
  configName?: string
  todoColumns?: string[]
  // Simplified - removed unused fields and views that aren't used in the UI
}

export interface MultiProjectData {
  projects: ProjectData[]
  lastFetched: string
  errors: Array<{
    projectName: string
    error: string
  }>
} 