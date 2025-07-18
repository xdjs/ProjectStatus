/**
 * GitHub API Client for Projects V2
 * 
 * This module provides a reusable client for interacting with GitHub's GraphQL API
 * specifically for Projects V2 (the new GitHub project format).
 * 
 * Features:
 * - Handles both organization and user project queries
 * - Rate limiting and authentication
 * - Concurrent project fetching with error isolation
 * - Comprehensive error handling
 */

import { graphql } from '@octokit/graphql'
import { ProjectConfig } from '@/types/github'
import { 
  EnhancedError, 
  classifyGitHubError, 
  retryOperation, 
  handleRateLimit,
  ErrorContext,
  logError
} from './error-handling'

// GitHub API rate limit and authentication errors
export class GitHubApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public projectName?: string
  ) {
    super(message)
    this.name = 'GitHubApiError'
  }
}

// Project fetching result types
export interface ProjectFetchResult {
  success: true
  data: any
  projectName: string
}

export interface ProjectFetchError {
  success: false
  error: GitHubApiError
  projectName: string
}

export type ProjectFetchOutcome = ProjectFetchResult | ProjectFetchError

// Shared GraphQL fragments for Projects V2
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

// GraphQL queries for different project contexts
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

/**
 * GitHub API Client for Projects V2
 */
export class GitHubClient {
  private graphqlWithAuth: any
  private token: string

  constructor(token: string) {
    this.token = token
    this.graphqlWithAuth = graphql.defaults({
      headers: {
        authorization: `token ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
  }

  /**
   * GraphQL query with enhanced error handling and retry logic
   */
  private async graphqlWithRetry(
    query: string,
    variables: any,
    context: ErrorContext
  ): Promise<any> {
    return retryOperation(
      async () => {
        try {
          return await this.graphqlWithAuth(query, variables)
        } catch (error: any) {
          // Handle rate limiting
          if (this.isRateLimitError(error)) {
            await handleRateLimit(error)
            throw error // Will be retried
          }
          
          // Classify and enhance the error
          const enhancedError = classifyGitHubError(error)
          enhancedError.context = context
          
          logError(enhancedError, context)
          throw enhancedError
        }
      },
      3, // Max retries
      1000, // Base delay
      context
    )
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    return error.status === 403 && 
           (error.message?.includes('rate limit') || 
            error.message?.includes('API rate limit'))
  }

  /**
   * Create error context for a project operation
   */
  private createErrorContext(
    operation: string,
    projectName: string,
    metadata?: Record<string, any>
  ): ErrorContext {
    return {
      operation,
      projectName,
      timestamp: new Date().toISOString(),
      metadata
    }
  }

  /**
   * Fetches a single project from GitHub Projects V2
   * Tries organization scope first, then user scope
   */
  async fetchProject(config: ProjectConfig): Promise<any> {
    const { owner, projectNumber } = config
    
    // Add cache-busting to avoid stale responses
    const timestamp = Date.now()
    const cacheId = Math.random().toString(36).substring(7)
    
    const queries = [
      { 
        query: ORG_PROJECT_QUERY, 
        accessor: (data: any) => data.organization?.projectV2,
        context: 'organization'
      },
      { 
        query: USER_PROJECT_QUERY, 
        accessor: (data: any) => data.user?.projectV2,
        context: 'user'
      }
    ]
    
    let lastError: any = null
    
    for (const { query, accessor, context } of queries) {
      try {
        console.log(`Fetching project ${config.name} from ${context} scope...`)
        
        const errorContext = this.createErrorContext(
          `fetch_project_${context}`,
          config.name,
          { owner, projectNumber, context }
        )
        
        const data = await this.graphqlWithRetry(query, { 
          owner, 
          number: projectNumber,
          _cacheBust: timestamp,
          _requestId: cacheId
        }, errorContext)
        
        const project = accessor(data)
        if (project) {
          console.log(`Successfully fetched project ${config.name} from ${context} scope`)
          return project
        }
      } catch (error: any) {
        lastError = error
        
        // If this is a non-retryable error, don't try other scopes
        if (error instanceof EnhancedError && !error.retryable) {
          throw error
        }
        
        console.log(`Failed to fetch project ${config.name} from ${context} scope:`, error.message)
        // Continue to next query type
      }
    }
    
    // If we get here, both queries failed
    const enhancedError = new EnhancedError(
      `Project not found in organization or user account: ${config.name}`,
      'NOT_FOUND',
      404,
      false,
      this.createErrorContext('fetch_project_not_found', config.name, { owner, projectNumber })
    )
    
    throw enhancedError
  }

  /**
   * Fetches multiple projects concurrently with error isolation
   */
  async fetchMultipleProjects(configs: ProjectConfig[]): Promise<ProjectFetchOutcome[]> {
    console.log(`Fetching ${configs.length} projects concurrently...`)
    
    const fetchPromises = configs.map(async (config): Promise<ProjectFetchOutcome> => {
      try {
        const project = await this.fetchProject(config)
        return {
          success: true,
          data: project,
          projectName: config.name
        }
      } catch (error: any) {
        console.error(`Error fetching project ${config.name}:`, error)
        
        // If it's already an EnhancedError, use it directly
        if (error instanceof EnhancedError) {
          return {
            success: false,
            error: error,
            projectName: config.name
          }
        }
        
        // Otherwise, create a new enhanced error
        const enhancedError = error instanceof GitHubApiError ? 
          classifyGitHubError(error) : 
          new EnhancedError(
            error.message || 'Unknown error',
            'GENERIC_ERROR',
            error.status || 500,
            true,
            this.createErrorContext('fetch_project_generic_error', config.name, { error: error.message })
          )
        
        return {
          success: false,
          error: enhancedError,
          projectName: config.name
        }
      }
    })

    const results = await Promise.allSettled(fetchPromises)
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        console.error(`Promise rejected for project ${configs[index].name}:`, result.reason)
        
        const enhancedError = new EnhancedError(
          result.reason?.message || 'Promise rejected',
          'GENERIC_ERROR',
          500,
          true,
          this.createErrorContext('fetch_project_promise_rejected', configs[index].name, { reason: result.reason })
        )
        
        return {
          success: false,
          error: enhancedError,
          projectName: configs[index].name
        }
      }
    })
  }

  /**
   * Validates the GitHub token and checks for appropriate scopes
   */
  static validateToken(token: string): void {
    if (!token || typeof token !== 'string') {
      throw new GitHubApiError('GitHub token is required')
    }

    // Basic token format validation
    if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
      throw new GitHubApiError(
        'Invalid GitHub token format. Must be a personal access token.'
      )
    }

    // Token should be at least 40 characters (classic tokens)
    if (token.length < 40) {
      throw new GitHubApiError(
        'GitHub token appears to be too short. Please verify your token.'
      )
    }
  }

  /**
   * Creates a new GitHub client with validation
   */
  static create(token: string): GitHubClient {
    GitHubClient.validateToken(token)
    return new GitHubClient(token)
  }

  /**
   * Checks if an error is a rate limit error
   */
  static isRateLimitError(error: any): boolean {
    return error.status === 403 && error.message?.includes('rate limit')
  }

  /**
   * Checks if an error is an authentication error
   */
  static isAuthError(error: any): boolean {
    return error.status === 401 || error.status === 403
  }

  /**
   * Checks if an error is a not found error
   */
  static isNotFoundError(error: any): boolean {
    return error.status === 404
  }

  /**
   * Extracts meaningful error message from GitHub API error
   */
  static getErrorMessage(error: any): string {
    if (GitHubClient.isRateLimitError(error)) {
      return 'GitHub API rate limit exceeded. Please try again later.'
    }
    
    if (GitHubClient.isAuthError(error)) {
      return 'Authentication failed. Please check your GitHub token and permissions.'
    }
    
    if (GitHubClient.isNotFoundError(error)) {
      return 'Project not found. Please check the owner and project number.'
    }
    
    return error.message || 'Unknown GitHub API error'
  }
}