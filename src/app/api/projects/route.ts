import { NextRequest, NextResponse } from 'next/server'
import { graphql } from '@octokit/graphql'
import { getProjectConfigs, isMultiProjectMode } from '@/lib/config'
import { ProjectConfig, ProjectData, MultiProjectData } from '@/types/github'

// Shared fragments to eliminate duplication
const PROJECT_FIELDS = `
  id
  number
  title
  shortDescription
  readme
  public
  closed
  createdAt
  updatedAt
  url
  owner {
    ... on User { login avatarUrl url }
    ... on Organization { login avatarUrl url }
  }
  items(first: 100) {
    nodes {
      id
      type
      createdAt
      updatedAt
      content {
        ... on Issue {
          id title body url state createdAt updatedAt closedAt
          author { login avatarUrl url }
          assignees(first: 10) { nodes { login avatarUrl url } }
          labels(first: 10) { nodes { name color description } }
          milestone { title description dueOn state }
          repository { name nameWithOwner url description }
        }
        ... on PullRequest {
          id title body url state createdAt updatedAt closedAt mergedAt
          author { login avatarUrl url }
          assignees(first: 10) { nodes { login avatarUrl url } }
          labels(first: 10) { nodes { name color description } }
          milestone { title description dueOn state }
          repository { name nameWithOwner url description }
        }
        ... on DraftIssue {
          id title body createdAt updatedAt
          creator { login avatarUrl url }
          assignees(first: 10) { nodes { login avatarUrl url } }
        }
      }
      fieldValues(first: 20) {
        nodes {
          ... on ProjectV2ItemFieldTextValue {
            text
            field { ... on ProjectV2FieldCommon { name } }
          }
          ... on ProjectV2ItemFieldNumberValue {
            number
            field { ... on ProjectV2FieldCommon { name } }
          }
          ... on ProjectV2ItemFieldSingleSelectValue {
            name
            field { ... on ProjectV2FieldCommon { name } }
          }
          ... on ProjectV2ItemFieldDateValue {
            date
            field { ... on ProjectV2FieldCommon { name } }
          }
        }
      }
    }
  }
  fields(first: 20) {
    nodes {
      ... on ProjectV2Field { id name dataType }
      ... on ProjectV2SingleSelectField {
        id name dataType
        options { id name color }
      }
    }
  }
  views(first: 10) {
    nodes {
      id name layout
      fields(first: 20) {
        nodes { ... on ProjectV2Field { id name } }
      }
    }
  }
`

const ORG_PROJECT_QUERY = `
  query GetOrgProject($owner: String!, $number: Int!) {
    organization(login: $owner) {
      projectV2(number: $number) { ${PROJECT_FIELDS} }
    }
  }
`

const USER_PROJECT_QUERY = `
  query GetUserProject($owner: String!, $number: Int!) {
    user(login: $owner) {
      projectV2(number: $number) { ${PROJECT_FIELDS} }
    }
  }
`

function transformProjectItem(item: any): any {
  const content = item.content
  const baseItem = {
    id: item.id,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    projectFields: item.fieldValues.nodes.map((fv: any) => ({
      name: fv.field?.name || 'Unknown',
      value: fv.text || fv.number?.toString() || fv.name || fv.date || null
    }))
  }

  // Debug: Log field values for debugging
  if (content?.title) {
    console.log(`Issue "${content.title}" field values:`, item.fieldValues.nodes.map((fv: any) => ({
      field: fv.field?.name,
      value: fv.text || fv.number?.toString() || fv.name || fv.date || null
    })))
  }

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

async function fetchProject(graphqlWithAuth: any, owner: string, projectNumber: number, repo?: string) {
  // Add cache-busting timestamp to queries
  const timestamp = Date.now()
  const cacheId = Math.random().toString(36).substring(7)
  
  // Try organization first, then user
  const queries = [
    { query: ORG_PROJECT_QUERY, accessor: (data: any) => data.organization?.projectV2 },
    { query: USER_PROJECT_QUERY, accessor: (data: any) => data.user?.projectV2 }
  ]
  
  for (const { query, accessor } of queries) {
    try {
      console.log(`Executing GraphQL query with cache-bust: ${timestamp}-${cacheId}`)
      const data = await graphqlWithAuth(query, { 
        owner, 
        number: projectNumber,
        _cacheBust: timestamp,
        _requestId: cacheId
      })
      const project = accessor(data)
      if (project) return project
    } catch (error) {
      // Continue to next query
    }
  }
  throw new Error('Project not found in organization or user account')
}

function transformProject(project: any, config: ProjectConfig): ProjectData {
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
    repository: project.items.nodes[0]?.content?.repository || {
      name: config.repo || 'Unknown',
      fullName: `${config.owner}/${config.repo || 'Unknown'}`,
      url: `https://github.com/${config.owner}/${config.repo || ''}`,
      description: ''
    },
    items: project.items.nodes.map(transformProjectItem),
    // Multi-project specific fields
    projectName: config.name,
    projectConfig: config
  }
}

async function fetchSingleProject(config: ProjectConfig, token: string): Promise<ProjectData> {
  const graphqlWithAuth = graphql.defaults({
    headers: {
      authorization: `token ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'X-Request-ID': `${Date.now()}-${Math.random()}`, // Cache busting
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'If-None-Match': '*', // Force fresh response
      'X-Fresh-Request': Date.now().toString()
    },
  })

  console.log(`Fetching project data for ${config.name} from GitHub...`)
  const startTime = Date.now()
  const project = await fetchProject(graphqlWithAuth, config.owner, config.projectNumber, config.repo)
  const fetchTime = Date.now() - startTime
  console.log(`GitHub API response received in ${fetchTime}ms for ${config.name}`)

  return transformProject(project, config)
}

export async function GET(request: NextRequest) {
  try {
    console.log('Multi-project API request started at:', new Date().toISOString())
    
    // Check for force refresh parameter
    const url = new URL(request.url)
    const forceRefresh = url.searchParams.get('force') || url.searchParams.get('t')
    console.log('Force refresh parameter:', forceRefresh)
    
    // Get project configurations
    const configs = getProjectConfigs()
    const token = process.env.GITHUB_TOKEN
    
    if (!token) {
      return NextResponse.json(
        { error: 'Missing GITHUB_TOKEN environment variable' },
        { status: 500 }
      )
    }

    if (configs.length === 0) {
      return NextResponse.json(
        { error: 'No project configurations found' },
        { status: 500 }
      )
    }

    console.log(`Fetching ${configs.length} projects: ${configs.map(c => c.name).join(', ')}`)

    // Fetch all projects concurrently using Promise.allSettled
    const projectPromises = configs.map(async (config) => {
      try {
        const project = await fetchSingleProject(config, token)
        return { status: 'fulfilled' as const, value: project }
      } catch (error: any) {
        console.error(`Error fetching project ${config.name}:`, error)
        return { 
          status: 'rejected' as const, 
          reason: error,
          projectName: config.name
        }
      }
    })

    const results = await Promise.allSettled(projectPromises)
    
    // Process results
    const projects: ProjectData[] = []
    const errors: Array<{ projectName: string; error: string }> = []

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value.status === 'fulfilled') {
          projects.push(result.value.value)
        } else {
          errors.push({
            projectName: result.value.projectName,
            error: result.value.reason?.message || 'Unknown error'
          })
        }
      } else {
        errors.push({
          projectName: configs[index].name,
          error: result.reason?.message || 'Unknown error'
        })
      }
    })

    const response: MultiProjectData = {
      projects,
      lastFetched: new Date().toISOString(),
      errors
    }

    console.log(`Returning ${projects.length} projects with ${errors.length} errors`)
    if (errors.length > 0) {
      console.log('Errors:', errors)
    }

    const nextResponse = NextResponse.json(response)
    
    // Prevent caching with maximum aggression
    nextResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, private, max-age=0')
    nextResponse.headers.set('Pragma', 'no-cache')
    nextResponse.headers.set('Expires', '0')
    nextResponse.headers.set('Surrogate-Control', 'no-store')
    nextResponse.headers.set('Vary', '*')
    nextResponse.headers.set('Last-Modified', new Date().toUTCString())
    nextResponse.headers.set('ETag', `"${Date.now()}-${Math.random()}"`)
    
    return nextResponse
  } catch (error: any) {
    console.error('Multi-project API Error:', error)
    
    const statusMap: Record<number, string> = {
      401: 'Invalid GitHub token or insufficient permissions',
      404: 'One or more projects not found. Check your owner and project numbers.'
    }
    
    const message = statusMap[error.status] || `Failed to fetch project data: ${error.message}`
    return NextResponse.json({ error: message }, { status: error.status || 500 })
  }
}

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0