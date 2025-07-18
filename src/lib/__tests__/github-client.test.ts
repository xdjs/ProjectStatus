import { GitHubClient, GitHubApiError } from '../github-client'
import { EnhancedError } from '../error-handling'
import { graphql } from '@octokit/graphql'
import { ProjectConfig } from '@/types/github'

// Mock the @octokit/graphql module
jest.mock('@octokit/graphql')

const mockGraphql = graphql as jest.MockedFunction<typeof graphql>

// Mock project configurations
const mockProjectConfig: ProjectConfig = {
  name: 'Test Project',
  owner: 'test-org',
  repo: 'test-repo',
  projectNumber: 1,
  todoColumns: ['TODO', 'In Progress']
}

const mockMultiProjectConfigs: ProjectConfig[] = [
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

describe('GitHubClient', () => {
  let client: GitHubClient
  let mockGraphqlWithAuth: jest.Mock

  beforeEach(() => {
    mockGraphqlWithAuth = jest.fn()
    mockGraphql.defaults = jest.fn().mockReturnValue(mockGraphqlWithAuth)
    client = new GitHubClient('test-token')
    
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should create a GitHub client with authentication', () => {
      expect(mockGraphql.defaults).toHaveBeenCalledWith({
        headers: {
          authorization: 'token test-token',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      })
    })
  })

  describe('fetchProject', () => {
    it('should fetch project from organization scope', async () => {
      mockGraphqlWithAuth.mockResolvedValue({
        organization: {
          projectV2: createMockProject()
        }
      })

      const result = await client.fetchProject(mockProjectConfig)

      expect(result).toEqual(createMockProject())
      expect(mockGraphqlWithAuth).toHaveBeenCalledWith(
        expect.stringContaining('organization(login: $owner)'),
        expect.objectContaining({
          owner: 'test-org',
          number: 1
        })
      )
    })

    it('should fallback to user scope if organization fails', async () => {
      mockGraphqlWithAuth
        .mockRejectedValueOnce(new Error('Organization not found'))
        .mockResolvedValueOnce({
          user: {
            projectV2: createMockProject()
          }
        })

      const result = await client.fetchProject(mockProjectConfig)

      expect(result).toEqual(createMockProject())
      expect(mockGraphqlWithAuth).toHaveBeenCalledTimes(2)
    })

    it('should throw error if both organization and user queries fail', async () => {
      mockGraphqlWithAuth
        .mockRejectedValueOnce(new Error('Organization not found'))
        .mockRejectedValueOnce(new Error('User not found'))

      await expect(client.fetchProject(mockProjectConfig))
        .rejects.toThrow('Project not found')
    })

    it('should handle rate limit errors', async () => {
      const rateLimitError = { status: 403, message: 'rate limit exceeded' }
      mockGraphqlWithAuth.mockRejectedValue(rateLimitError)

      await expect(client.fetchProject(mockProjectConfig))
        .rejects.toThrow(EnhancedError)
    }, 10000)

    it('should handle authentication errors', async () => {
      const authError = { status: 401, message: 'Bad credentials' }
      mockGraphqlWithAuth.mockRejectedValue(authError)

      await expect(client.fetchProject(mockProjectConfig))
        .rejects.toThrow(EnhancedError)
    })

    it('should include cache-busting parameters', async () => {
      mockGraphqlWithAuth.mockResolvedValue({
        organization: {
          projectV2: createMockProject()
        }
      })

      await client.fetchProject(mockProjectConfig)

      expect(mockGraphqlWithAuth).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          _cacheBust: expect.any(Number),
          _requestId: expect.any(String)
        })
      )
    })
  })

  describe('fetchMultipleProjects', () => {
    it('should fetch multiple projects successfully', async () => {
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

      const results = await client.fetchMultipleProjects(mockMultiProjectConfigs)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
      
      if (results[0].success) {
        expect(results[0].data.title).toBe('Project A')
        expect(results[0].projectName).toBe('Project A')
      }
      
      if (results[1].success) {
        expect(results[1].data.title).toBe('Project B')
        expect(results[1].projectName).toBe('Project B')
      }
    })

    it('should handle individual project failures gracefully', async () => {
      mockGraphqlWithAuth
        .mockResolvedValueOnce({
          organization: {
            projectV2: createMockProject({ title: 'Project A' })
          }
        })
        .mockRejectedValueOnce(new Error('Project not found'))

      const results = await client.fetchMultipleProjects(mockMultiProjectConfigs)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      
      if (!results[1].success) {
        expect(results[1].error).toBeInstanceOf(EnhancedError)
        expect(results[1].projectName).toBe('Project B')
      }
    })

    it('should handle all projects failing', async () => {
      mockGraphqlWithAuth.mockRejectedValue(new Error('API Error'))

      const results = await client.fetchMultipleProjects(mockMultiProjectConfigs)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(false)
      expect(results[1].success).toBe(false)
      
      results.forEach((result, index) => {
        if (!result.success) {
          expect(result.error).toBeInstanceOf(EnhancedError)
          expect(result.projectName).toBe(mockMultiProjectConfigs[index].name)
        }
      })
    }, 10000)

    it('should handle Promise.allSettled rejections', async () => {
      // Mock a case where Promise.allSettled itself might have issues
      mockGraphqlWithAuth.mockImplementation(() => {
        throw new Error('Synchronous error')
      })

      const results = await client.fetchMultipleProjects(mockMultiProjectConfigs)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(false)
      expect(results[1].success).toBe(false)
    }, 10000)
  })

  describe('validateToken', () => {
    it('should validate correct GitHub personal access token', () => {
      expect(() => GitHubClient.validateToken('ghp_1234567890abcdef1234567890abcdef12345678')).not.toThrow()
    })

    it('should validate correct GitHub fine-grained token', () => {
      expect(() => GitHubClient.validateToken('github_pat_1234567890abcdef1234567890abcdef12345678')).not.toThrow()
    })

    it('should throw error for empty token', () => {
      expect(() => GitHubClient.validateToken('')).toThrow('GitHub token is required')
    })

    it('should throw error for null token', () => {
      expect(() => GitHubClient.validateToken(null as any)).toThrow('GitHub token is required')
    })

    it('should throw error for undefined token', () => {
      expect(() => GitHubClient.validateToken(undefined as any)).toThrow('GitHub token is required')
    })

    it('should throw error for invalid token format', () => {
      expect(() => GitHubClient.validateToken('invalid-token')).toThrow('Invalid GitHub token format')
    })

    it('should throw error for token that is too short', () => {
      expect(() => GitHubClient.validateToken('ghp_short')).toThrow('GitHub token appears to be too short')
    })
  })

  describe('create', () => {
    it('should create a new GitHub client', () => {
      const client = GitHubClient.create('ghp_1234567890abcdef1234567890abcdef12345678')
      expect(client).toBeInstanceOf(GitHubClient)
    })

    it('should validate token before creating client', () => {
      expect(() => GitHubClient.create('invalid-token')).toThrow('Invalid GitHub token format')
    })
  })

  describe('error checking utilities', () => {
    it('should identify rate limit errors', () => {
      const rateLimitError = { status: 403, message: 'rate limit exceeded' }
      expect(GitHubClient.isRateLimitError(rateLimitError)).toBe(true)
      
      const otherError = { status: 500, message: 'Internal server error' }
      expect(GitHubClient.isRateLimitError(otherError)).toBe(false)
    })

    it('should identify authentication errors', () => {
      const authError401 = { status: 401, message: 'Bad credentials' }
      const authError403 = { status: 403, message: 'Forbidden' }
      const otherError = { status: 404, message: 'Not found' }
      
      expect(GitHubClient.isAuthError(authError401)).toBe(true)
      expect(GitHubClient.isAuthError(authError403)).toBe(true)
      expect(GitHubClient.isAuthError(otherError)).toBe(false)
    })

    it('should identify not found errors', () => {
      const notFoundError = { status: 404, message: 'Not found' }
      const otherError = { status: 500, message: 'Internal server error' }
      
      expect(GitHubClient.isNotFoundError(notFoundError)).toBe(true)
      expect(GitHubClient.isNotFoundError(otherError)).toBe(false)
    })
  })

  describe('getErrorMessage', () => {
    it('should return rate limit message for rate limit errors', () => {
      const rateLimitError = { status: 403, message: 'rate limit exceeded' }
      expect(GitHubClient.getErrorMessage(rateLimitError))
        .toBe('GitHub API rate limit exceeded. Please try again later.')
    })

    it('should return auth message for authentication errors', () => {
      const authError = { status: 401, message: 'Bad credentials' }
      expect(GitHubClient.getErrorMessage(authError))
        .toBe('Authentication failed. Please check your GitHub token and permissions.')
    })

    it('should return not found message for 404 errors', () => {
      const notFoundError = { status: 404, message: 'Not found' }
      expect(GitHubClient.getErrorMessage(notFoundError))
        .toBe('Project not found. Please check the owner and project number.')
    })

    it('should return original message for other errors', () => {
      const otherError = { status: 500, message: 'Internal server error' }
      expect(GitHubClient.getErrorMessage(otherError))
        .toBe('Internal server error')
    })

    it('should return default message for errors without message', () => {
      const errorWithoutMessage = { status: 500 }
      expect(GitHubClient.getErrorMessage(errorWithoutMessage))
        .toBe('Unknown GitHub API error')
    })
  })

  describe('GitHubApiError', () => {
    it('should create error with message', () => {
      const error = new GitHubApiError('Test error')
      expect(error.message).toBe('Test error')
      expect(error.name).toBe('GitHubApiError')
    })

    it('should create error with status and project name', () => {
      const error = new GitHubApiError('Test error', 404, 'Test Project')
      expect(error.message).toBe('Test error')
      expect(error.status).toBe(404)
      expect(error.projectName).toBe('Test Project')
    })
  })
})