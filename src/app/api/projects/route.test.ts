/**
 * Tests for multi-project API endpoint rate limiting and error handling
 */

import { NextRequest } from 'next/server'
import { GET } from './route'

// Mock dependencies
jest.mock('@/lib/config')
jest.mock('@/lib/github-client')
jest.mock('@/lib/data-transform')

const mockGetProjectConfigs = require('@/lib/config').getProjectConfigs as jest.Mock
const mockGitHubClient = require('@/lib/github-client').GitHubClient as jest.Mock
const mockTransformProject = require('@/lib/data-transform').transformProject as jest.Mock
const mockValidateProjectData = require('@/lib/data-transform').validateProjectData as jest.Mock
const mockSortProjects = require('@/lib/data-transform').sortProjects as jest.Mock

describe('/api/projects', () => {
  const mockConfigs = [
    { name: 'Project 1', owner: 'owner1', repo: 'repo1', projectNumber: 1, todoColumns: ['Todo'] },
    { name: 'Project 2', owner: 'owner2', repo: 'repo2', projectNumber: 2, todoColumns: ['Todo'] }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mocks
    mockGetProjectConfigs.mockReturnValue(mockConfigs)
    mockValidateProjectData.mockReturnValue(true)
    mockTransformProject.mockImplementation((data, config) => ({ 
      ...data, 
      name: config.name,
      transformedAt: new Date().toISOString()
    }))
    mockSortProjects.mockImplementation(projects => projects)
    
    // Mock environment variables
    process.env.GITHUB_TOKEN = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz123456'
  })

  afterEach(() => {
    delete process.env.GITHUB_TOKEN
  })

  it('should return error when GITHUB_TOKEN is missing', async () => {
    delete process.env.GITHUB_TOKEN
    
    const request = new NextRequest('http://localhost:3000/api/projects')
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(500)
    expect(data.error).toBe('Missing GITHUB_TOKEN environment variable')
  })

  it('should return error when no project configurations found', async () => {
    mockGetProjectConfigs.mockReturnValue([])
    
    const request = new NextRequest('http://localhost:3000/api/projects')
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(500)
    expect(data.error).toBe('No project configurations found')
  })

  it('should handle rate limit errors correctly', async () => {
    const mockClient = {
      fetchMultipleProjects: jest.fn().mockResolvedValue([
        {
          success: false,
          error: { status: 429, message: 'API rate limit exceeded' },
          projectName: 'Project 1'
        },
        {
          success: false,
          error: { status: 429, message: 'API rate limit exceeded' },
          projectName: 'Project 2'
        }
      ])
    }
    
    mockGitHubClient.create.mockReturnValue(mockClient)
    
    const request = new NextRequest('http://localhost:3000/api/projects')
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.projects).toEqual([])
    expect(data.errors).toHaveLength(2)
    expect(data.errors[0].error).toBe('Rate limit exceeded - please wait before retrying')
    expect(data.errors[1].error).toBe('Rate limit exceeded - please wait before retrying')
  })

  it('should handle mixed success and error results', async () => {
    const mockProjectData = { id: '1', title: 'Success Project' }
    
    const mockClient = {
      fetchMultipleProjects: jest.fn().mockResolvedValue([
        {
          success: true,
          data: mockProjectData,
          projectName: 'Project 1'
        },
        {
          success: false,
          error: { status: 404, message: 'Project not found' },
          projectName: 'Project 2'
        }
      ])
    }
    
    mockGitHubClient.create.mockReturnValue(mockClient)
    
    const request = new NextRequest('http://localhost:3000/api/projects')
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.projects).toHaveLength(1)
    expect(data.errors).toHaveLength(1)
    expect(data.errors[0].projectName).toBe('Project 2')
    expect(data.errors[0].error).toBe('Project not found')
  })

  it('should handle invalid project data', async () => {
    const mockClient = {
      fetchMultipleProjects: jest.fn().mockResolvedValue([
        {
          success: true,
          data: { invalid: 'data' },
          projectName: 'Project 1'
        }
      ])
    }
    
    mockGitHubClient.create.mockReturnValue(mockClient)
    mockValidateProjectData.mockReturnValue(false)
    
    const request = new NextRequest('http://localhost:3000/api/projects')
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.projects).toHaveLength(0)
    expect(data.errors).toHaveLength(1)
    expect(data.errors[0].error).toBe('Invalid project data structure')
  })

  it('should set proper cache-busting headers', async () => {
    const mockClient = {
      fetchMultipleProjects: jest.fn().mockResolvedValue([])
    }
    
    mockGitHubClient.create.mockReturnValue(mockClient)
    
    const request = new NextRequest('http://localhost:3000/api/projects')
    const response = await GET(request)
    
    expect(response.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate, proxy-revalidate, private, max-age=0')
    expect(response.headers.get('Pragma')).toBe('no-cache')
    expect(response.headers.get('Expires')).toBe('0')
  })

  it('should handle force refresh parameter', async () => {
    const mockClient = {
      fetchMultipleProjects: jest.fn().mockResolvedValue([])
    }
    
    mockGitHubClient.create.mockReturnValue(mockClient)
    
    const request = new NextRequest('http://localhost:3000/api/projects?force=true')
    const response = await GET(request)
    
    expect(response.status).toBe(200)
    expect(mockClient.fetchMultipleProjects).toHaveBeenCalled()
  })

  it('should return proper response structure', async () => {
    const mockProjectData = { id: '1', title: 'Test Project' }
    const mockTransformedProject = { ...mockProjectData, name: 'Project 1', transformedAt: '2024-01-01' }
    
    const mockClient = {
      fetchMultipleProjects: jest.fn().mockResolvedValue([
        {
          success: true,
          data: mockProjectData,
          projectName: 'Project 1'
        }
      ])
    }
    
    mockGitHubClient.create.mockReturnValue(mockClient)
    mockTransformProject.mockReturnValue(mockTransformedProject)
    mockSortProjects.mockReturnValue([mockTransformedProject])
    
    const request = new NextRequest('http://localhost:3000/api/projects')
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data).toHaveProperty('projects')
    expect(data).toHaveProperty('lastFetched')
    expect(data).toHaveProperty('errors')
    expect(Array.isArray(data.projects)).toBe(true)
    expect(Array.isArray(data.errors)).toBe(true)
    expect(typeof data.lastFetched).toBe('string')
  })
})