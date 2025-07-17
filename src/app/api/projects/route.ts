import { NextRequest, NextResponse } from 'next/server'
import { getProjectConfigs } from '@/lib/config'
import { GitHubClient } from '@/lib/github-client'
import { transformProject, validateProjectData, sortProjects } from '@/lib/data-transform'
import { ProjectConfig, ProjectData, MultiProjectData } from '@/types/github'

// Data transformation functions moved to @/lib/data-transform

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
        // Validate project data before transformation
        if (validateProjectData(result.data)) {
          const config = configs.find(c => c.name === result.projectName)!
          const project = transformProject(result.data, config)
          projects.push(project)
        } else {
          errors.push({
            projectName: result.projectName,
            error: 'Invalid project data structure'
          })
        }
      } else {
        errors.push({
          projectName: result.projectName,
          error: result.error.message
        })
      }
    })

    // Sort projects by name for consistent display
    const sortedProjects = sortProjects(projects, 'name')

    const response: MultiProjectData = {
      projects: sortedProjects,
      lastFetched: new Date().toISOString(),
      errors
    }

    console.log(`Returning ${sortedProjects.length} projects with ${errors.length} errors`)
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