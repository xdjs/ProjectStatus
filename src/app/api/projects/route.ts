import { NextRequest, NextResponse } from 'next/server'
import { getProjectConfigs } from '@/lib/config'
import { GitHubClient } from '@/lib/github-client'
import { ProjectConfig, ProjectData, MultiProjectData } from '@/types/github'

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

// This function has been moved to GitHubClient class

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

// This function has been replaced by GitHubClient.fetchProject

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

    // Create GitHub client
    const client = GitHubClient.create(token)
    
    // Fetch all projects concurrently using the client
    const results = await client.fetchMultipleProjects(configs)
    
    // Process results
    const projects: ProjectData[] = []
    const errors: Array<{ projectName: string; error: string }> = []

    results.forEach((result) => {
      if (result.success) {
        const project = transformProject(result.data, configs.find(c => c.name === result.projectName)!)
        projects.push(project)
      } else {
        errors.push({
          projectName: result.projectName,
          error: result.error.message
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
    
    // Use GitHub client's error handling utilities
    const message = error.message || 'Unknown error'
    const status = error.status || 500
    
    return NextResponse.json({ error: message }, { status })
  }
}

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0