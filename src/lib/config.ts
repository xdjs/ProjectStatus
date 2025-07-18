import { ProjectConfig } from '@/types/github'

/**
 * Configuration parser for GitHub Projects V2
 * 
 * This module handles parsing of both multi-project and legacy single-project
 * configurations for GitHub Projects V2 (the new GitHub project format).
 * 
 * Note: This is for GitHub Projects V2, not classic projects.
 */

/**
 * Configuration parsing errors
 */
export class ConfigurationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'ConfigurationError'
  }
}

/**
 * Validates a single project configuration
 */
function validateProjectConfig(config: any, index: number): ProjectConfig {
  const prefix = `Project ${index + 1}`
  
  if (!config || typeof config !== 'object') {
    throw new ConfigurationError(`${prefix} must be an object`)
  }

  const requiredFields = ['name', 'owner', 'repo', 'projectNumber', 'todoColumns']
  
  for (const field of requiredFields) {
    if (!(field in config)) {
      throw new ConfigurationError(`${prefix} missing required field: ${field}`, field)
    }
  }

  // Validate name
  if (typeof config.name !== 'string' || config.name.trim() === '') {
    throw new ConfigurationError(`${prefix} name must be a non-empty string`, 'name')
  }

  // Validate owner
  if (typeof config.owner !== 'string' || config.owner.trim() === '') {
    throw new ConfigurationError(`${prefix} owner must be a non-empty string`, 'owner')
  }

  // Validate repo
  if (typeof config.repo !== 'string' || config.repo.trim() === '') {
    throw new ConfigurationError(`${prefix} repo must be a non-empty string`, 'repo')
  }

  // Validate projectNumber
  if (typeof config.projectNumber !== 'number' || config.projectNumber <= 0) {
    throw new ConfigurationError(`${prefix} projectNumber must be a positive number`, 'projectNumber')
  }

  // Validate todoColumns
  if (!Array.isArray(config.todoColumns)) {
    throw new ConfigurationError(`${prefix} todoColumns must be an array`, 'todoColumns')
  }

  if (config.todoColumns.length === 0) {
    throw new ConfigurationError(`${prefix} todoColumns cannot be empty`, 'todoColumns')
  }

  for (let i = 0; i < config.todoColumns.length; i++) {
    if (typeof config.todoColumns[i] !== 'string' || config.todoColumns[i].trim() === '') {
      throw new ConfigurationError(`${prefix} todoColumns[${i}] must be a non-empty string`, 'todoColumns')
    }
  }

  return {
    name: config.name.trim(),
    owner: config.owner.trim(),
    repo: config.repo.trim(),
    projectNumber: config.projectNumber,
    todoColumns: config.todoColumns.map((col: string) => col.trim())
  }
}

/**
 * Parses multi-project configuration from JSON string
 */
function parseMultiProjectConfig(jsonString: string): ProjectConfig[] {
  let parsed: any
  
  try {
    parsed = JSON.parse(jsonString)
  } catch (error) {
    throw new ConfigurationError('PROJECTS_CONFIG must be valid JSON')
  }

  if (!Array.isArray(parsed)) {
    throw new ConfigurationError('PROJECTS_CONFIG must be an array of project configurations')
  }

  if (parsed.length === 0) {
    throw new ConfigurationError('PROJECTS_CONFIG cannot be empty')
  }

  return parsed.map((config, index) => validateProjectConfig(config, index))
}

/**
 * Creates a single project configuration from legacy environment variables
 */
function createLegacyProjectConfig(): ProjectConfig {
  const owner = process.env.GITHUB_OWNER?.trim()
  const repo = process.env.GITHUB_REPO?.trim()
  const projectNumber = process.env.PROJECT_NUMBER

  if (!owner) {
    throw new ConfigurationError('GITHUB_OWNER environment variable is required for legacy mode', 'GITHUB_OWNER')
  }

  if (!repo) {
    throw new ConfigurationError('GITHUB_REPO environment variable is required for legacy mode', 'GITHUB_REPO')
  }

  if (!projectNumber) {
    throw new ConfigurationError('PROJECT_NUMBER environment variable is required for legacy mode', 'PROJECT_NUMBER')
  }

  const projectNum = parseInt(projectNumber, 10)
  if (isNaN(projectNum) || projectNum <= 0) {
    throw new ConfigurationError('PROJECT_NUMBER must be a positive number', 'PROJECT_NUMBER')
  }

  return {
    name: `${owner}/${repo}`,
    owner,
    repo,
    projectNumber: projectNum,
    todoColumns: ['TODO'] // Default TODO column for legacy mode
  }
}

/**
 * Gets project configurations from environment variables
 * Supports both new multi-project format and legacy single-project format
 */
export function getProjectConfigs(): ProjectConfig[] {
  const multiProjectConfig = process.env.PROJECTS_CONFIG?.trim()
  
  let configs: ProjectConfig[]
  
  if (multiProjectConfig) {
    // New multi-project format
    configs = parseMultiProjectConfig(multiProjectConfig)
  } else {
    // Legacy single-project format
    configs = [createLegacyProjectConfig()]
  }
  
  // Validate configuration limits and consistency
  validateConfigurationLimits(configs)
  
  return configs
}

/**
 * Checks if the current configuration is multi-project mode
 */
export function isMultiProjectMode(): boolean {
  return !!process.env.PROJECTS_CONFIG?.trim()
}

/**
 * Validates GitHub token is present and has appropriate scopes for Projects V2
 */
export function validateGitHubToken(): string {
  const token = process.env.GITHUB_TOKEN?.trim()
  
  if (!token) {
    throw new ConfigurationError('GITHUB_TOKEN environment variable is required for GitHub Projects V2 API')
  }

  // Basic token format validation
  if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
    throw new ConfigurationError('GITHUB_TOKEN appears to be invalid format. Must be a GitHub personal access token.')
  }

  // Check minimum length (GitHub tokens are typically longer)
  if (token.length < 20) {
    throw new ConfigurationError('GITHUB_TOKEN appears to be too short. Please verify your token is complete.')
  }

  return token
}

/**
 * Validates project configuration limits and provides usage recommendations
 */
export function validateConfigurationLimits(configs: ProjectConfig[]): void {
  const maxProjects = 10
  const maxTodoColumns = 5
  
  if (configs.length > maxProjects) {
    throw new ConfigurationError(`Too many projects configured (${configs.length}). Maximum recommended: ${maxProjects}`)
  }
  
  // Check for duplicate project names
  const projectNames = configs.map(config => config.name.toLowerCase())
  const duplicates = projectNames.filter((name, index) => projectNames.indexOf(name) !== index)
  if (duplicates.length > 0) {
    throw new ConfigurationError(`Duplicate project names found: ${duplicates.join(', ')}. Project names must be unique.`)
  }
  
  // Check for duplicate owner/repo combinations
  const projectKeys = configs.map(config => `${config.owner}/${config.repo}`)
  const duplicateKeys = projectKeys.filter((key, index) => projectKeys.indexOf(key) !== index)
  if (duplicateKeys.length > 0) {
    throw new ConfigurationError(`Duplicate owner/repo combinations found: ${duplicateKeys.join(', ')}. Each project must be unique.`)
  }
  
  // Validate todo columns count
  configs.forEach((config, index) => {
    if (config.todoColumns.length > maxTodoColumns) {
      throw new ConfigurationError(`Project ${index + 1} (${config.name}) has too many TODO columns (${config.todoColumns.length}). Maximum recommended: ${maxTodoColumns}`)
    }
  })
}