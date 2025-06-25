import { NextRequest, NextResponse } from 'next/server'
import { graphql } from '@octokit/graphql'

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
  // Try organization first, then user
  const queries = [
    { query: ORG_PROJECT_QUERY, accessor: (data: any) => data.organization?.projectV2 },
    { query: USER_PROJECT_QUERY, accessor: (data: any) => data.user?.projectV2 }
  ]
  
  for (const { query, accessor } of queries) {
    try {
      const data = await graphqlWithAuth(query, { owner, number: projectNumber })
      const project = accessor(data)
      if (project) return project
    } catch (error) {
      // Continue to next query
    }
  }
  throw new Error('Project not found in organization or user account')
}

export async function GET() {
  try {
    console.log('GitHub API request started at:', new Date().toISOString())
    
    const { GITHUB_OWNER: owner, GITHUB_REPO: repo, PROJECT_NUMBER: projectNumber, GITHUB_TOKEN: token } = process.env

    if (!owner || !projectNumber || !token) {
      return NextResponse.json(
        { error: 'Missing environment variables: GITHUB_OWNER, GITHUB_TOKEN, and PROJECT_NUMBER are required.' },
        { status: 500 }
      )
    }

    const graphqlWithAuth = graphql.defaults({
      headers: {
        authorization: `token ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'X-Request-ID': `${Date.now()}-${Math.random()}` // Cache busting
      },
    })

    console.log('Fetching project data from GitHub...')
    const startTime = Date.now()
    const project = await fetchProject(graphqlWithAuth, owner, parseInt(projectNumber), repo)
    const fetchTime = Date.now() - startTime
    console.log(`GitHub API response received in ${fetchTime}ms`)

    const transformedProject = {
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
        name: repo || 'Unknown',
        fullName: `${owner}/${repo || 'Unknown'}`,
        url: `https://github.com/${owner}/${repo || ''}`,
        description: ''
      },
      items: project.items.nodes.map(transformProjectItem)
    }

    console.log(`Returning ${transformedProject.items.length} project items`)

    const response = NextResponse.json(transformedProject)
    
    // Prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('Surrogate-Control', 'no-store')
    
    return response
  } catch (error: any) {
    console.error('GitHub API Error:', error)
    
    const statusMap: Record<number, string> = {
      401: 'Invalid GitHub token or insufficient permissions',
      404: 'Project not found. Check your owner and project number.'
    }
    
    const message = statusMap[error.status] || `Failed to fetch project data: ${error.message}`
    return NextResponse.json({ error: message }, { status: error.status || 500 })
  }
} 