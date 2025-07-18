/**
 * Tests for GitHub API client rate limiting and error handling
 */

import { GitHubClient, GitHubApiError } from './github-client'
import { ProjectConfig } from '@/types/github'

// Mock the graphql dependency
jest.mock('@octokit/graphql', () => ({
  graphql: {
    defaults: jest.fn(() => jest.fn())
  }
}))

describe('GitHubClient', () => {
  const mockToken = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz123456'
  const mockConfig: ProjectConfig = {
    name: 'Test Project',
    owner: 'testowner',
    repo: 'testrepo',
    projectNumber: 1,
    todoColumns: ['Todo']
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('token validation', () => {
    it('should validate valid GitHub tokens', () => {
      expect(() => GitHubClient.validateToken('ghp_1234567890abcdefghijklmnopqrstuvwxyz123456')).not.toThrow()
      expect(() => GitHubClient.validateToken('github_pat_1234567890abcdefghijklmnopqrstuvwxyz123456')).not.toThrow()
    })

    it('should reject invalid GitHub tokens', () => {
      expect(() => GitHubClient.validateToken('')).toThrow('GitHub token is required')
      expect(() => GitHubClient.validateToken('invalid_token')).toThrow('Invalid GitHub token format')
      expect(() => GitHubClient.validateToken('ghp_123')).toThrow('GitHub token appears to be too short')
    })

    it('should create client with valid token', () => {
      expect(() => GitHubClient.create(mockToken)).not.toThrow()
    })
  })

  describe('error classification', () => {
    it('should identify rate limit errors correctly', () => {
      const rateLimitError = { status: 403, message: 'API rate limit exceeded' }
      expect(GitHubClient.isRateLimitError(rateLimitError)).toBe(true)
      
      const normalError = { status: 404, message: 'Not found' }
      expect(GitHubClient.isRateLimitError(normalError)).toBe(false)
    })

    it('should identify authentication errors correctly', () => {
      const authError401 = { status: 401, message: 'Unauthorized' }
      const authError403 = { status: 403, message: 'Forbidden' }
      expect(GitHubClient.isAuthError(authError401)).toBe(true)
      expect(GitHubClient.isAuthError(authError403)).toBe(true)
      
      const normalError = { status: 404, message: 'Not found' }
      expect(GitHubClient.isAuthError(normalError)).toBe(false)
    })

    it('should identify not found errors correctly', () => {
      const notFoundError = { status: 404, message: 'Not found' }
      expect(GitHubClient.isNotFoundError(notFoundError)).toBe(true)
      
      const normalError = { status: 500, message: 'Internal error' }
      expect(GitHubClient.isNotFoundError(normalError)).toBe(false)
    })
  })

  describe('error message extraction', () => {
    it('should return specific message for rate limit errors', () => {
      const rateLimitError = { status: 403, message: 'API rate limit exceeded' }
      expect(GitHubClient.getErrorMessage(rateLimitError)).toBe('GitHub API rate limit exceeded. Please try again later.')
    })

    it('should return specific message for auth errors', () => {
      const authError = { status: 401, message: 'Unauthorized' }
      expect(GitHubClient.getErrorMessage(authError)).toBe('Authentication failed. Please check your GitHub token and permissions.')
    })

    it('should return specific message for not found errors', () => {
      const notFoundError = { status: 404, message: 'Not found' }
      expect(GitHubClient.getErrorMessage(notFoundError)).toBe('Project not found. Please check the owner and project number.')
    })

    it('should return original message for unknown errors', () => {
      const unknownError = { status: 500, message: 'Internal server error' }
      expect(GitHubClient.getErrorMessage(unknownError)).toBe('Internal server error')
    })
  })

  describe('rate limit handling in fetchProject', () => {
    it('should throw rate limit error immediately without retrying', async () => {
      const mockGraphql = jest.fn()
        .mockRejectedValueOnce({ status: 403, message: 'API rate limit exceeded' })
      
      require('@octokit/graphql').graphql.defaults.mockReturnValue(mockGraphql)
      
      const client = new GitHubClient(mockToken)
      
      await expect(client.fetchProject(mockConfig)).rejects.toThrow(GitHubApiError)
      
      // Should only call once (for org query) and not retry with user query
      expect(mockGraphql).toHaveBeenCalledTimes(1)
    })

    it('should retry with user query for non-rate-limit errors', async () => {
      const mockGraphql = jest.fn()
        .mockRejectedValueOnce({ status: 404, message: 'Not found' }) // org query fails
        .mockRejectedValueOnce({ status: 404, message: 'Not found' }) // user query fails
      
      require('@octokit/graphql').graphql.defaults.mockReturnValue(mockGraphql)
      
      const client = new GitHubClient(mockToken)
      
      await expect(client.fetchProject(mockConfig)).rejects.toThrow(GitHubApiError)
      await expect(client.fetchProject(mockConfig)).rejects.toThrow('Project not found in organization or user account')
      
      // Should call twice per fetchProject call (org and user queries) = 4 total
      expect(mockGraphql).toHaveBeenCalledTimes(4)
    })
  })

  describe('fetchMultipleProjects', () => {
    it('should handle rate limit errors in concurrent fetches', async () => {
      const configs = [mockConfig, { ...mockConfig, name: 'Test Project 2' }]
      
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      const mockGraphql = jest.fn()
        .mockRejectedValue({ status: 403, message: 'API rate limit exceeded' })
      
      require('@octokit/graphql').graphql.defaults.mockReturnValue(mockGraphql)
      
      const client = new GitHubClient(mockToken)
      const results = await client.fetchMultipleProjects(configs)
      
      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(false)
      expect(results[1].success).toBe(false)
      
      if (!results[0].success) {
        expect(results[0].error.message).toContain('rate limit exceeded')
      }
      if (!results[1].success) {
        expect(results[1].error.message).toContain('rate limit exceeded')
      }
      
      consoleSpy.mockRestore()
    })

    it('should isolate errors between projects', async () => {
      const configs = [mockConfig, { ...mockConfig, name: 'Test Project 2' }]
      
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      const mockGraphql = jest.fn()
        .mockResolvedValueOnce({ organization: { projectV2: { id: '1', title: 'Success' } } }) // first project succeeds
        .mockRejectedValueOnce({ status: 404, message: 'Not found' }) // second project fails org
        .mockRejectedValueOnce({ status: 404, message: 'Not found' }) // second project fails user
      
      require('@octokit/graphql').graphql.defaults.mockReturnValue(mockGraphql)
      
      const client = new GitHubClient(mockToken)
      const results = await client.fetchMultipleProjects(configs)
      
      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      
      if (results[0].success) {
        expect(results[0].data).toEqual({ id: '1', title: 'Success' })
      }
      if (!results[1].success) {
        expect(results[1].error.message).toContain('Project not found')
      }
      
      consoleSpy.mockRestore()
    })
  })

  describe('GitHubApiError', () => {
    it('should create error with message and status', () => {
      const error = new GitHubApiError('Test error', 404, 'Test Project')
      expect(error.message).toBe('Test error')
      expect(error.status).toBe(404)
      expect(error.projectName).toBe('Test Project')
      expect(error.name).toBe('GitHubApiError')
    })
  })
})