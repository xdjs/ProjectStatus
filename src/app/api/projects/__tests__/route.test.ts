import { NextRequest } from 'next/server'
import { GET } from '../route'
import * as configLib from '@/lib/config'
import * as githubClientLib from '@/lib/github-client'

// Mock the dependencies
jest.mock('@/lib/config')
jest.mock('@/lib/github-client')

const mockGetProjectConfigs = configLib.getProjectConfigs as jest.MockedFunction<typeof configLib.getProjectConfigs>
const mockGitHubClient = githubClientLib.GitHubClient as jest.MockedClass<typeof githubClientLib.GitHubClient>

// Mock project configurations
const mockSingleProjectConfig = {
  name: 'Test Project',
  owner: 'test-org',
  repo: 'test-repo',
  projectNumber: 1,
  todoColumns: ['TODO', 'In Progress']
}

const mockMultiProjectConfigs = [
  {
    name: 'Project A',
    owner: 'org-a',
    repo: 'repo-a',
    projectNumber: 1,
    todoColumns: ['TODO', 'Doing']
  },
  {
    name: 'Project B',
    owner: 'org-b',
    repo: 'repo-b',
    projectNumber: 2,
    todoColumns: ['Backlog', 'Active']
  }
]

// Mock project data
const createMockProject = (overrides: any = {}) => ({
  id: 'PROJECT_123',
  number: 1,
  title: 'Test Project',
  shortDescription: 'Test Description',
  readme: 'Test README',
  public: true,
  closed: false,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-02T00:00:00Z',
  url: 'https://github.com/orgs/test/projects/1',
  owner: {
    login: 'test-org',
    avatarUrl: 'https://github.com/test-org.png',
    url: 'https://github.com/test-org'
  },
  items: {
    nodes: [
      {
        id: 'ITEM_1',
        type: 'ISSUE',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        content: {
          id: 'ISSUE_1',
          title: 'Test Issue',
          body: 'Test issue body',
          url: 'https://github.com/test-org/test-repo/issues/1',
          state: 'OPEN',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          closedAt: null,
          author: {
            login: 'test-user',
            avatarUrl: 'https://github.com/test-user.png',
            url: 'https://github.com/test-user'
          },
          assignees: { nodes: [] },
          labels: { nodes: [] },
          milestone: null,
          repository: {
            name: 'test-repo',
            nameWithOwner: 'test-org/test-repo',
            url: 'https://github.com/test-org/test-repo',
            description: 'Test repository'
          }
        },
        fieldValues: {
          nodes: [
            {
              field: { name: 'Status' },
              name: 'TODO'
            }
          ]
        }
      }
    ]
  },
  fields: { nodes: [] },
  views: { nodes: [] },
  ...overrides
})

describe('Multi-Project API Endpoint (Refactored)', () => {
  let originalEnv: NodeJS.ProcessEnv
  let mockClientInstance: any

  beforeEach(() => {
    originalEnv = process.env
    process.env = { ...originalEnv, GITHUB_TOKEN: 'ghp_1234567890abcdef1234567890abcdef12345678' }
    jest.clearAllMocks()
    
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    
    // Set up mock client instance
    mockClientInstance = {
      fetchMultipleProjects: jest.fn()
    }
    
    // Mock GitHubClient.create to return our mock instance
    mockGitHubClient.create = jest.fn().mockReturnValue(mockClientInstance)
  })

  afterEach(() => {
    process.env = originalEnv
    jest.restoreAllMocks()
  })

  describe('Environment validation', () => {
    it('should return error if GITHUB_TOKEN is missing', async () => {
      delete process.env.GITHUB_TOKEN
      mockGetProjectConfigs.mockReturnValue([mockSingleProjectConfig])

      const request = new NextRequest('http://localhost:3000/api/projects')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Missing GITHUB_TOKEN environment variable')
    })

    it('should return error if no project configurations found', async () => {
      mockGetProjectConfigs.mockReturnValue([])

      const request = new NextRequest('http://localhost:3000/api/projects')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('No project configurations found')
    })
  })

  describe('Single project handling', () => {
    it('should successfully fetch single project', async () => {
      mockGetProjectConfigs.mockReturnValue([mockSingleProjectConfig])
      
      mockClientInstance.fetchMultipleProjects.mockResolvedValue([
        {
          success: true,
          data: createMockProject(),
          projectName: 'Test Project'
        }
      ])

      const request = new NextRequest('http://localhost:3000/api/projects')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.projects).toHaveLength(1)
      expect(data.projects[0].projectName).toBe('Test Project')
      expect(data.projects[0].title).toBe('Test Project')
      expect(data.projects[0].items).toHaveLength(1)
      expect(data.errors).toHaveLength(0)
    })
  })

  describe('Multi-project handling', () => {
    it('should successfully fetch multiple projects', async () => {
      mockGetProjectConfigs.mockReturnValue(mockMultiProjectConfigs)
      
      mockClientInstance.fetchMultipleProjects.mockResolvedValue([
        {
          success: true,
          data: createMockProject({ title: 'Project A' }),
          projectName: 'Project A'
        },
        {
          success: true,
          data: createMockProject({ title: 'Project B' }),
          projectName: 'Project B'
        }
      ])

      const request = new NextRequest('http://localhost:3000/api/projects')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.projects).toHaveLength(2)
      expect(data.projects[0].projectName).toBe('Project A')
      expect(data.projects[1].projectName).toBe('Project B')
      expect(data.errors).toHaveLength(0)
    })

    it('should handle individual project failures gracefully', async () => {
      mockGetProjectConfigs.mockReturnValue(mockMultiProjectConfigs)
      
      mockClientInstance.fetchMultipleProjects.mockResolvedValue([
        {
          success: true,
          data: createMockProject({ title: 'Project A' }),
          projectName: 'Project A'
        },
        {
          success: false,
          error: { message: 'Project not found' },
          projectName: 'Project B'
        }
      ])

      const request = new NextRequest('http://localhost:3000/api/projects')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.projects).toHaveLength(1)
      expect(data.projects[0].projectName).toBe('Project A')
      expect(data.errors).toHaveLength(1)
      expect(data.errors[0].projectName).toBe('Project B')
      expect(data.errors[0].error).toBe('Project not found')
    })

    it('should handle all projects failing', async () => {
      mockGetProjectConfigs.mockReturnValue(mockMultiProjectConfigs)
      
      mockClientInstance.fetchMultipleProjects.mockResolvedValue([
        {
          success: false,
          error: { message: 'API Error' },
          projectName: 'Project A'
        },
        {
          success: false,
          error: { message: 'API Error' },
          projectName: 'Project B'
        }
      ])

      const request = new NextRequest('http://localhost:3000/api/projects')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.projects).toHaveLength(0)
      expect(data.errors).toHaveLength(2)
      expect(data.errors[0].projectName).toBe('Project A')
      expect(data.errors[1].projectName).toBe('Project B')
    })
  })

  describe('GitHub Client integration', () => {
    it('should create GitHub client with token', async () => {
      mockGetProjectConfigs.mockReturnValue([mockSingleProjectConfig])
      
      mockClientInstance.fetchMultipleProjects.mockResolvedValue([
        {
          success: true,
          data: createMockProject(),
          projectName: 'Test Project'
        }
      ])

      const request = new NextRequest('http://localhost:3000/api/projects')
      await GET(request)

      expect(mockGitHubClient.create).toHaveBeenCalledWith('ghp_1234567890abcdef1234567890abcdef12345678')
      expect(mockClientInstance.fetchMultipleProjects).toHaveBeenCalledWith([mockSingleProjectConfig])
    })

    it('should handle GitHub client creation errors', async () => {
      mockGetProjectConfigs.mockReturnValue([mockSingleProjectConfig])
      
      mockGitHubClient.create.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      const request = new NextRequest('http://localhost:3000/api/projects')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Invalid token')
    })
  })

  describe('Response format', () => {
    it('should return MultiProjectData format', async () => {
      mockGetProjectConfigs.mockReturnValue(mockMultiProjectConfigs)
      
      mockClientInstance.fetchMultipleProjects.mockResolvedValue([
        {
          success: true,
          data: createMockProject(),
          projectName: 'Project A'
        },
        {
          success: true,
          data: createMockProject(),
          projectName: 'Project B'
        }
      ])

      const request = new NextRequest('http://localhost:3000/api/projects')
      const response = await GET(request)
      const data = await response.json()

      expect(data).toHaveProperty('projects')
      expect(data).toHaveProperty('lastFetched')
      expect(data).toHaveProperty('errors')
      expect(Array.isArray(data.projects)).toBe(true)
      expect(Array.isArray(data.errors)).toBe(true)
      expect(typeof data.lastFetched).toBe('string')
    })

    it('should set correct no-cache headers', async () => {
      mockGetProjectConfigs.mockReturnValue([mockSingleProjectConfig])
      
      mockClientInstance.fetchMultipleProjects.mockResolvedValue([
        {
          success: true,
          data: createMockProject(),
          projectName: 'Test Project'
        }
      ])

      const request = new NextRequest('http://localhost:3000/api/projects')
      const response = await GET(request)

      expect(response.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate, proxy-revalidate, private, max-age=0')
      expect(response.headers.get('Pragma')).toBe('no-cache')
      expect(response.headers.get('Expires')).toBe('0')
      expect(response.headers.get('Surrogate-Control')).toBe('no-store')
      expect(response.headers.get('Vary')).toBe('*')
      expect(response.headers.get('Last-Modified')).toBeDefined()
      expect(response.headers.get('ETag')).toBeDefined()
    })
  })
})