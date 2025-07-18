"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationError = void 0;
exports.getProjectConfigs = getProjectConfigs;
exports.isMultiProjectMode = isMultiProjectMode;
exports.validateGitHubToken = validateGitHubToken;
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
class ConfigurationError extends Error {
    constructor(message, field) {
        super(message);
        this.field = field;
        this.name = 'ConfigurationError';
    }
}
exports.ConfigurationError = ConfigurationError;
/**
 * Validates a single project configuration
 */
function validateProjectConfig(config, index) {
    const prefix = `Project ${index + 1}`;
    if (!config || typeof config !== 'object') {
        throw new ConfigurationError(`${prefix} must be an object`);
    }
    const requiredFields = ['name', 'owner', 'repo', 'projectNumber', 'todoColumns'];
    for (const field of requiredFields) {
        if (!(field in config)) {
            throw new ConfigurationError(`${prefix} missing required field: ${field}`, field);
        }
    }
    // Validate name
    if (typeof config.name !== 'string' || config.name.trim() === '') {
        throw new ConfigurationError(`${prefix} name must be a non-empty string`, 'name');
    }
    // Validate owner
    if (typeof config.owner !== 'string' || config.owner.trim() === '') {
        throw new ConfigurationError(`${prefix} owner must be a non-empty string`, 'owner');
    }
    // Validate repo
    if (typeof config.repo !== 'string' || config.repo.trim() === '') {
        throw new ConfigurationError(`${prefix} repo must be a non-empty string`, 'repo');
    }
    // Validate projectNumber
    if (typeof config.projectNumber !== 'number' || config.projectNumber <= 0) {
        throw new ConfigurationError(`${prefix} projectNumber must be a positive number`, 'projectNumber');
    }
    // Validate todoColumns
    if (!Array.isArray(config.todoColumns)) {
        throw new ConfigurationError(`${prefix} todoColumns must be an array`, 'todoColumns');
    }
    if (config.todoColumns.length === 0) {
        throw new ConfigurationError(`${prefix} todoColumns cannot be empty`, 'todoColumns');
    }
    for (let i = 0; i < config.todoColumns.length; i++) {
        if (typeof config.todoColumns[i] !== 'string' || config.todoColumns[i].trim() === '') {
            throw new ConfigurationError(`${prefix} todoColumns[${i}] must be a non-empty string`, 'todoColumns');
        }
    }
    return {
        name: config.name.trim(),
        owner: config.owner.trim(),
        repo: config.repo.trim(),
        projectNumber: config.projectNumber,
        todoColumns: config.todoColumns.map((col) => col.trim())
    };
}
/**
 * Parses multi-project configuration from JSON string
 */
function parseMultiProjectConfig(jsonString) {
    let parsed;
    try {
        parsed = JSON.parse(jsonString);
    }
    catch (error) {
        throw new ConfigurationError('PROJECTS_CONFIG must be valid JSON');
    }
    if (!Array.isArray(parsed)) {
        throw new ConfigurationError('PROJECTS_CONFIG must be an array of project configurations');
    }
    if (parsed.length === 0) {
        throw new ConfigurationError('PROJECTS_CONFIG cannot be empty');
    }
    return parsed.map((config, index) => validateProjectConfig(config, index));
}
/**
 * Creates a single project configuration from legacy environment variables
 */
function createLegacyProjectConfig() {
    const owner = process.env.GITHUB_OWNER?.trim();
    const repo = process.env.GITHUB_REPO?.trim();
    const projectNumber = process.env.PROJECT_NUMBER;
    if (!owner) {
        throw new ConfigurationError('GITHUB_OWNER environment variable is required for legacy mode', 'GITHUB_OWNER');
    }
    if (!repo) {
        throw new ConfigurationError('GITHUB_REPO environment variable is required for legacy mode', 'GITHUB_REPO');
    }
    if (!projectNumber) {
        throw new ConfigurationError('PROJECT_NUMBER environment variable is required for legacy mode', 'PROJECT_NUMBER');
    }
    const projectNum = parseInt(projectNumber, 10);
    if (isNaN(projectNum) || projectNum <= 0) {
        throw new ConfigurationError('PROJECT_NUMBER must be a positive number', 'PROJECT_NUMBER');
    }
    return {
        name: `${owner}/${repo}`,
        owner,
        repo,
        projectNumber: projectNum,
        todoColumns: ['TODO'] // Default TODO column for legacy mode
    };
}
/**
 * Gets project configurations from environment variables
 * Supports both new multi-project format and legacy single-project format
 */
function getProjectConfigs() {
    const multiProjectConfig = process.env.PROJECTS_CONFIG?.trim();
    if (multiProjectConfig) {
        // New multi-project format
        return parseMultiProjectConfig(multiProjectConfig);
    }
    else {
        // Legacy single-project format
        return [createLegacyProjectConfig()];
    }
}
/**
 * Checks if the current configuration is multi-project mode
 */
function isMultiProjectMode() {
    return !!process.env.PROJECTS_CONFIG?.trim();
}
/**
 * Validates GitHub token is present and has appropriate scopes for Projects V2
 */
function validateGitHubToken() {
    const token = process.env.GITHUB_TOKEN?.trim();
    if (!token) {
        throw new ConfigurationError('GITHUB_TOKEN environment variable is required for GitHub Projects V2 API');
    }
    // Basic token format validation
    if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
        throw new ConfigurationError('GITHUB_TOKEN appears to be invalid format. Must be a GitHub personal access token.');
    }
    return token;
}
