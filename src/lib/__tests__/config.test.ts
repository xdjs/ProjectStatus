import { 
  getProjectConfigs, 
  isMultiProjectMode, 
  validateGitHubToken, 
  ConfigurationError 
} from '../config'

// Mock environment variables
const mockEnv = (vars: Record<string, string | undefined>) => {
  const originalEnv = process.env
  process.env = { ...originalEnv, ...vars }
  return () => {
    process.env = originalEnv
  }
}

describe('Configuration Parser for GitHub Projects V2', () => {
  describe('getProjectConfigs', () => {
    describe('Multi-project mode', () => {
      it('should parse valid multi-project configuration', () => {
        const restore = mockEnv({
          PROJECTS_CONFIG: JSON.stringify([
            {
              name: 'Project A',
              owner: 'org1',
              repo: 'repo1',
              projectNumber: 1,
              todoColumns: ['TODO', 'In Progress']
            },
            {
              name: 'Project B',
              owner: 'org2',
              repo: 'repo2',
              projectNumber: 2,
              todoColumns: ['Backlog']
            }
          ])
        })

        const configs = getProjectConfigs()
        
        expect(configs).toHaveLength(2)
        expect(configs[0]).toEqual({
          name: 'Project A',
          owner: 'org1',
          repo: 'repo1',
          projectNumber: 1,
          todoColumns: ['TODO', 'In Progress']
        })
        expect(configs[1]).toEqual({
          name: 'Project B',
          owner: 'org2',
          repo: 'repo2',
          projectNumber: 2,
          todoColumns: ['Backlog']
        })

        restore()
      })

      it('should trim whitespace from configuration values', () => {
        const restore = mockEnv({
          PROJECTS_CONFIG: JSON.stringify([
            {
              name: '  Project A  ',
              owner: '  org1  ',
              repo: '  repo1  ',
              projectNumber: 1,
              todoColumns: ['  TODO  ', '  In Progress  ']
            }
          ])
        })

        const configs = getProjectConfigs()
        
        expect(configs[0]).toEqual({
          name: 'Project A',
          owner: 'org1',
          repo: 'repo1',
          projectNumber: 1,
          todoColumns: ['TODO', 'In Progress']
        })

        restore()
      })

      it('should throw error for invalid JSON', () => {
        const restore = mockEnv({
          PROJECTS_CONFIG: 'invalid json'
        })

        expect(() => getProjectConfigs()).toThrow(ConfigurationError)
        expect(() => getProjectConfigs()).toThrow('PROJECTS_CONFIG must be valid JSON')

        restore()
      })

      it('should throw error for non-array configuration', () => {
        const restore = mockEnv({
          PROJECTS_CONFIG: JSON.stringify({ not: 'array' })
        })

        expect(() => getProjectConfigs()).toThrow(ConfigurationError)
        expect(() => getProjectConfigs()).toThrow('PROJECTS_CONFIG must be an array')

        restore()
      })

      it('should throw error for empty array', () => {
        const restore = mockEnv({
          PROJECTS_CONFIG: JSON.stringify([])
        })

        expect(() => getProjectConfigs()).toThrow(ConfigurationError)
        expect(() => getProjectConfigs()).toThrow('PROJECTS_CONFIG cannot be empty')

        restore()
      })

      it('should throw error for missing required fields', () => {
        const restore = mockEnv({
          PROJECTS_CONFIG: JSON.stringify([
            {
              name: 'Project A',
              owner: 'org1',
              // missing repo, projectNumber, todoColumns
            }
          ])
        })

        expect(() => getProjectConfigs()).toThrow(ConfigurationError)
        expect(() => getProjectConfigs()).toThrow('Project 1 missing required field: repo')

        restore()
      })

      it('should throw error for invalid name', () => {
        const restore = mockEnv({
          PROJECTS_CONFIG: JSON.stringify([
            {
              name: '',
              owner: 'org1',
              repo: 'repo1',
              projectNumber: 1,
              todoColumns: ['TODO']
            }
          ])
        })

        expect(() => getProjectConfigs()).toThrow(ConfigurationError)
        expect(() => getProjectConfigs()).toThrow('Project 1 name must be a non-empty string')

        restore()
      })

      it('should throw error for invalid owner', () => {
        const restore = mockEnv({
          PROJECTS_CONFIG: JSON.stringify([
            {
              name: 'Project A',
              owner: 123,
              repo: 'repo1',
              projectNumber: 1,
              todoColumns: ['TODO']
            }
          ])
        })

        expect(() => getProjectConfigs()).toThrow(ConfigurationError)
        expect(() => getProjectConfigs()).toThrow('Project 1 owner must be a non-empty string')

        restore()
      })

      it('should throw error for invalid repo', () => {
        const restore = mockEnv({
          PROJECTS_CONFIG: JSON.stringify([
            {
              name: 'Project A',
              owner: 'org1',
              repo: '',
              projectNumber: 1,
              todoColumns: ['TODO']
            }
          ])
        })

        expect(() => getProjectConfigs()).toThrow(ConfigurationError)
        expect(() => getProjectConfigs()).toThrow('Project 1 repo must be a non-empty string')

        restore()
      })

      it('should throw error for invalid project number', () => {
        const restore = mockEnv({
          PROJECTS_CONFIG: JSON.stringify([
            {
              name: 'Project A',
              owner: 'org1',
              repo: 'repo1',
              projectNumber: -1,
              todoColumns: ['TODO']
            }
          ])
        })

        expect(() => getProjectConfigs()).toThrow(ConfigurationError)
        expect(() => getProjectConfigs()).toThrow('Project 1 projectNumber must be a positive number')

        restore()
      })

      it('should throw error for invalid todoColumns', () => {
        const restore = mockEnv({
          PROJECTS_CONFIG: JSON.stringify([
            {
              name: 'Project A',
              owner: 'org1',
              repo: 'repo1',
              projectNumber: 1,
              todoColumns: 'not-array'
            }
          ])
        })

        expect(() => getProjectConfigs()).toThrow(ConfigurationError)
        expect(() => getProjectConfigs()).toThrow('Project 1 todoColumns must be an array')

        restore()
      })

      it('should throw error for empty todoColumns', () => {
        const restore = mockEnv({
          PROJECTS_CONFIG: JSON.stringify([
            {
              name: 'Project A',
              owner: 'org1',
              repo: 'repo1',
              projectNumber: 1,
              todoColumns: []
            }
          ])
        })

        expect(() => getProjectConfigs()).toThrow(ConfigurationError)
        expect(() => getProjectConfigs()).toThrow('Project 1 todoColumns cannot be empty')

        restore()
      })

      it('should throw error for invalid todoColumns items', () => {
        const restore = mockEnv({
          PROJECTS_CONFIG: JSON.stringify([
            {
              name: 'Project A',
              owner: 'org1',
              repo: 'repo1',
              projectNumber: 1,
              todoColumns: ['TODO', '']
            }
          ])
        })

        expect(() => getProjectConfigs()).toThrow(ConfigurationError)
        expect(() => getProjectConfigs()).toThrow('Project 1 todoColumns[1] must be a non-empty string')

        restore()
      })
    })

    describe('Legacy single-project mode', () => {
      it('should parse valid legacy configuration', () => {
        const restore = mockEnv({
          GITHUB_OWNER: 'testowner',
          GITHUB_REPO: 'testrepo',
          PROJECT_NUMBER: '5'
        })

        const configs = getProjectConfigs()
        
        expect(configs).toHaveLength(1)
        expect(configs[0]).toEqual({
          name: 'testowner/testrepo',
          owner: 'testowner',
          repo: 'testrepo',
          projectNumber: 5,
          todoColumns: ['TODO']
        })

        restore()
      })

      it('should trim whitespace from legacy configuration', () => {
        const restore = mockEnv({
          GITHUB_OWNER: '  testowner  ',
          GITHUB_REPO: '  testrepo  ',
          PROJECT_NUMBER: '5'
        })

        const configs = getProjectConfigs()
        
        expect(configs[0]).toEqual({
          name: 'testowner/testrepo',
          owner: 'testowner',
          repo: 'testrepo',
          projectNumber: 5,
          todoColumns: ['TODO']
        })

        restore()
      })

      it('should throw error for missing GITHUB_OWNER', () => {
        const restore = mockEnv({
          GITHUB_REPO: 'testrepo',
          PROJECT_NUMBER: '5'
        })

        expect(() => getProjectConfigs()).toThrow(ConfigurationError)
        expect(() => getProjectConfigs()).toThrow('GITHUB_OWNER environment variable is required for legacy mode')

        restore()
      })

      it('should throw error for missing GITHUB_REPO', () => {
        const restore = mockEnv({
          GITHUB_OWNER: 'testowner',
          PROJECT_NUMBER: '5'
        })

        expect(() => getProjectConfigs()).toThrow(ConfigurationError)
        expect(() => getProjectConfigs()).toThrow('GITHUB_REPO environment variable is required for legacy mode')

        restore()
      })

      it('should throw error for missing PROJECT_NUMBER', () => {
        const restore = mockEnv({
          GITHUB_OWNER: 'testowner',
          GITHUB_REPO: 'testrepo'
        })

        expect(() => getProjectConfigs()).toThrow(ConfigurationError)
        expect(() => getProjectConfigs()).toThrow('PROJECT_NUMBER environment variable is required for legacy mode')

        restore()
      })

      it('should throw error for invalid PROJECT_NUMBER', () => {
        const restore = mockEnv({
          GITHUB_OWNER: 'testowner',
          GITHUB_REPO: 'testrepo',
          PROJECT_NUMBER: 'invalid'
        })

        expect(() => getProjectConfigs()).toThrow(ConfigurationError)
        expect(() => getProjectConfigs()).toThrow('PROJECT_NUMBER must be a positive number')

        restore()
      })

      it('should throw error for negative PROJECT_NUMBER', () => {
        const restore = mockEnv({
          GITHUB_OWNER: 'testowner',
          GITHUB_REPO: 'testrepo',
          PROJECT_NUMBER: '-1'
        })

        expect(() => getProjectConfigs()).toThrow(ConfigurationError)
        expect(() => getProjectConfigs()).toThrow('PROJECT_NUMBER must be a positive number')

        restore()
      })
    })
  })

  describe('isMultiProjectMode', () => {
    it('should return true when PROJECTS_CONFIG is set', () => {
      const restore = mockEnv({
        PROJECTS_CONFIG: JSON.stringify([{ name: 'test', owner: 'test', repo: 'test', projectNumber: 1, todoColumns: ['TODO'] }])
      })

      expect(isMultiProjectMode()).toBe(true)

      restore()
    })

    it('should return false when PROJECTS_CONFIG is not set', () => {
      const restore = mockEnv({
        PROJECTS_CONFIG: undefined
      })

      expect(isMultiProjectMode()).toBe(false)

      restore()
    })

    it('should return false when PROJECTS_CONFIG is empty string', () => {
      const restore = mockEnv({
        PROJECTS_CONFIG: ''
      })

      expect(isMultiProjectMode()).toBe(false)

      restore()
    })

    it('should return false when PROJECTS_CONFIG is only whitespace', () => {
      const restore = mockEnv({
        PROJECTS_CONFIG: '   '
      })

      expect(isMultiProjectMode()).toBe(false)

      restore()
    })
  })

  describe('validateGitHubToken', () => {
    it('should return valid GitHub personal access token', () => {
      const restore = mockEnv({
        GITHUB_TOKEN: 'ghp_1234567890abcdef'
      })

      expect(validateGitHubToken()).toBe('ghp_1234567890abcdef')

      restore()
    })

    it('should return valid GitHub fine-grained token', () => {
      const restore = mockEnv({
        GITHUB_TOKEN: 'github_pat_1234567890abcdef'
      })

      expect(validateGitHubToken()).toBe('github_pat_1234567890abcdef')

      restore()
    })

    it('should trim whitespace from token', () => {
      const restore = mockEnv({
        GITHUB_TOKEN: '  ghp_1234567890abcdef  '
      })

      expect(validateGitHubToken()).toBe('ghp_1234567890abcdef')

      restore()
    })

    it('should throw error for missing token', () => {
      const restore = mockEnv({
        GITHUB_TOKEN: undefined
      })

      expect(() => validateGitHubToken()).toThrow(ConfigurationError)
      expect(() => validateGitHubToken()).toThrow('GITHUB_TOKEN environment variable is required for GitHub Projects V2 API')

      restore()
    })

    it('should throw error for empty token', () => {
      const restore = mockEnv({
        GITHUB_TOKEN: ''
      })

      expect(() => validateGitHubToken()).toThrow(ConfigurationError)
      expect(() => validateGitHubToken()).toThrow('GITHUB_TOKEN environment variable is required for GitHub Projects V2 API')

      restore()
    })

    it('should throw error for invalid token format', () => {
      const restore = mockEnv({
        GITHUB_TOKEN: 'invalid_token_format'
      })

      expect(() => validateGitHubToken()).toThrow(ConfigurationError)
      expect(() => validateGitHubToken()).toThrow('GITHUB_TOKEN appears to be invalid format')

      restore()
    })
  })
})