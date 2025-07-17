import { NextRequest } from 'next/server'
import { GET } from '../route'
import { graphql } from '@octokit/graphql'
import * as configLib from '@/lib/config'

// Mock the dependencies
jest.mock('@octokit/graphql')
jest.mock('@/lib/config')

const mockGraphql = graphql as jest.MockedFunction<typeof graphql>
const mockGetProjectConfigs = configLib.getProjectConfigs as jest.MockedFunction<typeof configLib.getProjectConfigs>
const mockIsMultiProjectMode = configLib.isMultiProjectMode as jest.MockedFunction<typeof configLib.isMultiProjectMode>

// Mock GraphQL response factory
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
  fields: {
    nodes: [
      {
        id: 'FIELD_1',
        name: 'Status',
        dataType: 'SINGLE_SELECT'
      }
    ]
  },
  views: {
    nodes: [
      {
        id: 'VIEW_1',
        name: 'Board',
        layout: 'BOARD_LAYOUT',
        fields: {
          nodes: [
            {
              id: 'FIELD_1',
              name: 'Status'
            }
          ]
        }
      }
    ]
  },
  ...overrides
})

// Mock configurations
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

describe('Multi-Project API Endpoint', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = process.env
    process.env = { ...originalEnv, GITHUB_TOKEN: 'test-token' }
    jest.clearAllMocks()
    
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
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
      
      const mockGraphqlWithAuth = jest.fn()
      mockGraphqlWithAuth.mockResolvedValue({
        organization: {
          projectV2: createMockProject()
        }
      })
      
      mockGraphql.defaults = jest.fn().mockReturnValue(mockGraphqlWithAuth)

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

    it('should try user scope if organization scope fails', async () => {
      mockGetProjectConfigs.mockReturnValue([mockSingleProjectConfig])
      
      const mockGraphqlWithAuth = jest.fn()
      mockGraphqlWithAuth
        .mockRejectedValueOnce(new Error('Organization not found'))
        .mockResolvedValueOnce({
          user: {
            projectV2: createMockProject()
          }
        })
      
      mockGraphql.defaults = jest.fn().mockReturnValue(mockGraphqlWithAuth)

      const request = new NextRequest('http://localhost:3000/api/projects')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.projects).toHaveLength(1)
      expect(data.errors).toHaveLength(0)
      expect(mockGraphqlWithAuth).toHaveBeenCalledTimes(2)
    })
  })

  describe('Multi-project handling', () => {
    it('should successfully fetch multiple projects', async () => {
      mockGetProjectConfigs.mockReturnValue(mockMultiProjectConfigs)
      
      const mockGraphqlWithAuth = jest.fn()
      mockGraphqlWithAuth
        .mockResolvedValueOnce({
          organization: {
            projectV2: createMockProject({ title: 'Project A' })
          }
        })
        .mockResolvedValueOnce({
          organization: {
            projectV2: createMockProject({ title: 'Project B' })
          }
        })
      
      mockGraphql.defaults = jest.fn().mockReturnValue(mockGraphqlWithAuth)

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
      
      const mockGraphqlWithAuth = jest.fn()
      mockGraphqlWithAuth
        .mockResolvedValueOnce({
          organization: {
            projectV2: createMockProject({ title: 'Project A' })
          }
        })
        .mockRejectedValueOnce(new Error('Project not found'))
      
      mockGraphql.defaults = jest.fn().mockReturnValue(mockGraphqlWithAuth)

      const request = new NextRequest('http://localhost:3000/api/projects')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.projects).toHaveLength(1)
      expect(data.projects[0].projectName).toBe('Project A')
      expect(data.errors).toHaveLength(1)
      expect(data.errors[0].projectName).toBe('Project B')
      expect(data.errors[0].error).toBe('Project not found in organization or user account')
    })

    it('should handle all projects failing', async () => {
      mockGetProjectConfigs.mockReturnValue(mockMultiProjectConfigs)
      
      const mockGraphqlWithAuth = jest.fn()
      mockGraphqlWithAuth.mockRejectedValue(new Error('API Error'))
      
      mockGraphql.defaults = jest.fn().mockReturnValue(mockGraphqlWithAuth)

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

  describe('Data transformation', () => {
    it('should transform project data correctly', async () => {
      mockGetProjectConfigs.mockReturnValue([mockSingleProjectConfig])
      
      const mockGraphqlWithAuth = jest.fn()
      mockGraphqlWithAuth.mockResolvedValue({
        organization: {
          projectV2: createMockProject({
            title: 'Custom Project',
            shortDescription: 'Custom Description',
            closed: false
          })
        }
      })
      
      mockGraphql.defaults = jest.fn().mockReturnValue(mockGraphqlWithAuth)

      const request = new NextRequest('http://localhost:3000/api/projects')
      const response = await GET(request)
      const data = await response.json()

      const project = data.projects[0]
      expect(project.title).toBe('Custom Project')
      expect(project.description).toBe('Custom Description')
      expect(project.state).toBe('OPEN')
      expect(project.projectName).toBe('Test Project')
      expect(project.projectConfig).toEqual(mockSingleProjectConfig)
      expect(project.lastFetched).toBeDefined()
    })

    it('should handle draft issues correctly', async () => {
      mockGetProjectConfigs.mockReturnValue([mockSingleProjectConfig])
      
      const mockProject = createMockProject()
      mockProject.items.nodes = [
        {
          id: 'DRAFT_ITEM_1',
          type: 'DRAFT_ISSUE',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          content: null,
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
      
      const mockGraphqlWithAuth = jest.fn()
      mockGraphqlWithAuth.mockResolvedValue({
        organization: {
          projectV2: mockProject
        }
      })
      
      mockGraphql.defaults = jest.fn().mockReturnValue(mockGraphqlWithAuth)

      const request = new NextRequest('http://localhost:3000/api/projects')
      const response = await GET(request)
      const data = await response.json()

      const item = data.projects[0].items[0]
      expect(item.title).toBe('Draft Item')
      expect(item.type).toBe('DRAFT_ISSUE')
      expect(item.state).toBe('OPEN')
      expect(item.author.login).toBe('Unknown')
    })

    it('should handle pull requests correctly', async () => {
      mockGetProjectConfigs.mockReturnValue([mockSingleProjectConfig])
      
      const mockProject = createMockProject()
      mockProject.items.nodes = [
        {
          id: 'PR_ITEM_1',
          type: 'PULL_REQUEST',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          content: {
            id: 'PR_1',
            title: 'Test PR',
            body: 'Test PR body',
            url: 'https://github.com/test-org/test-repo/pull/1',
            state: 'OPEN',
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
            closedAt: null,
            mergedAt: null,
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
      
      const mockGraphqlWithAuth = jest.fn()
      mockGraphqlWithAuth.mockResolvedValue({
        organization: {
          projectV2: mockProject
        }
      })
      
      mockGraphql.defaults = jest.fn().mockReturnValue(mockGraphqlWithAuth)

      const request = new NextRequest('http://localhost:3000/api/projects')
      const response = await GET(request)
      const data = await response.json()

      const item = data.projects[0].items[0]
      expect(item.title).toBe('Test PR')
      expect(item.type).toBe('PULL_REQUEST')
      expect(item.state).toBe('OPEN')
      expect(item.mergedAt).toBeNull()
    })
  })

  describe('Error handling', () => {
    it('should handle GitHub API authentication errors', async () => {
      mockGetProjectConfigs.mockReturnValue([mockSingleProjectConfig])
      
      const mockGraphqlWithAuth = jest.fn()
      // The fetchProject function tries both organization and user queries
      mockGraphqlWithAuth.mockRejectedValue({ status: 401, message: 'Unauthorized' })
      
      mockGraphql.defaults = jest.fn().mockReturnValue(mockGraphqlWithAuth)

      const request = new NextRequest('http://localhost:3000/api/projects')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.projects).toHaveLength(0)
      expect(data.errors).toHaveLength(1)
      expect(data.errors[0].error).toBe('Project not found in organization or user account')
    })

    it('should handle project not found errors', async () => {
      mockGetProjectConfigs.mockReturnValue([mockSingleProjectConfig])
      
      const mockGraphqlWithAuth = jest.fn()
      // The fetchProject function tries both organization and user queries
      mockGraphqlWithAuth.mockRejectedValue({ status: 404, message: 'Not Found' })
      
      mockGraphql.defaults = jest.fn().mockReturnValue(mockGraphqlWithAuth)

      const request = new NextRequest('http://localhost:3000/api/projects')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.projects).toHaveLength(0)
      expect(data.errors).toHaveLength(1)
      expect(data.errors[0].error).toBe('Project not found in organization or user account')
    })

    it('should handle generic errors', async () => {
      mockGetProjectConfigs.mockReturnValue([mockSingleProjectConfig])
      
      const mockGraphqlWithAuth = jest.fn()
      // The fetchProject function tries both organization and user queries
      mockGraphqlWithAuth.mockRejectedValue(new Error('Network error'))
      
      mockGraphql.defaults = jest.fn().mockReturnValue(mockGraphqlWithAuth)

      const request = new NextRequest('http://localhost:3000/api/projects')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.projects).toHaveLength(0)
      expect(data.errors).toHaveLength(1)
      expect(data.errors[0].error).toBe('Project not found in organization or user account')
    })

    it('should handle configuration parsing errors', async () => {
      mockGetProjectConfigs.mockImplementation(() => {
        throw new Error('Invalid configuration')
      })

      const request = new NextRequest('http://localhost:3000/api/projects')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch project data: Invalid configuration')
    })
  })

  describe('Request parameters', () => {
    it('should handle force refresh parameter', async () => {
      mockGetProjectConfigs.mockReturnValue([mockSingleProjectConfig])
      
      const mockGraphqlWithAuth = jest.fn()
      mockGraphqlWithAuth.mockResolvedValue({
        organization: {
          projectV2: createMockProject()
        }
      })
      
      mockGraphql.defaults = jest.fn().mockReturnValue(mockGraphqlWithAuth)

      const request = new NextRequest('http://localhost:3000/api/projects?force=true')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(console.log).toHaveBeenCalledWith('Force refresh parameter:', 'true')
    })

    it('should handle timestamp parameter', async () => {
      mockGetProjectConfigs.mockReturnValue([mockSingleProjectConfig])
      
      const mockGraphqlWithAuth = jest.fn()
      mockGraphqlWithAuth.mockResolvedValue({
        organization: {
          projectV2: createMockProject()
        }
      })
      
      mockGraphql.defaults = jest.fn().mockReturnValue(mockGraphqlWithAuth)

      const request = new NextRequest('http://localhost:3000/api/projects?t=123456')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(console.log).toHaveBeenCalledWith('Force refresh parameter:', '123456')
    })
  })

  describe('Response headers', () => {
    it('should set correct no-cache headers', async () => {
      mockGetProjectConfigs.mockReturnValue([mockSingleProjectConfig])
      
      const mockGraphqlWithAuth = jest.fn()
      mockGraphqlWithAuth.mockResolvedValue({
        organization: {
          projectV2: createMockProject()
        }
      })
      
      mockGraphql.defaults = jest.fn().mockReturnValue(mockGraphqlWithAuth)

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

  describe('Response format', () => {
    it('should return MultiProjectData format', async () => {
      mockGetProjectConfigs.mockReturnValue(mockMultiProjectConfigs)
      
      const mockGraphqlWithAuth = jest.fn()
      mockGraphqlWithAuth.mockResolvedValue({
        organization: {
          projectV2: createMockProject()
        }
      })
      
      mockGraphql.defaults = jest.fn().mockReturnValue(mockGraphqlWithAuth)

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
  })
})