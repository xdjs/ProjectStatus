export interface ProjectItem {
  id: string
  title: string
  body?: string
  url: string
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  type: 'ISSUE' | 'PULL_REQUEST' | 'DRAFT_ISSUE'
  assignees: Array<{
    login: string
    avatarUrl: string
    url: string
  }>
  labels: Array<{
    name: string
    color: string
    description?: string
  }>
  createdAt: string
  updatedAt: string
  closedAt?: string
  mergedAt?: string
  author: {
    login: string
    avatarUrl: string
    url: string
  }
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

export interface ProjectColumn {
  id: string
  name: string
  items: ProjectItem[]
}

export interface ProjectData {
  id: string
  number: number
  title: string
  description?: string
  url: string
  shortDescription?: string
  readme?: string
  state: 'OPEN' | 'CLOSED'
  public: boolean
  createdAt: string
  updatedAt: string
  owner: {
    login: string
    avatarUrl: string
    url: string
  }
  repository: {
    name: string
    fullName: string
    url: string
    description?: string
  }
  fields: Array<{
    id: string
    name: string
    dataType: string
    settings: any
  }>
  items: ProjectItem[]
  views: Array<{
    id: string
    name: string
    layout: 'PROJECT_BOARD' | 'PROJECT_TABLE'
    fields: Array<{
      id: string
      name: string
      width?: number
      isHidden?: boolean
    }>
    groupBy?: Array<{
      id: string
      name: string
    }>
    sortBy?: Array<{
      id: string
      name: string
      direction: 'ASC' | 'DESC'
    }>
  }>
}

export interface GitHubConfig {
  owner: string
  repo: string
  projectNumber: number
  token: string
} 