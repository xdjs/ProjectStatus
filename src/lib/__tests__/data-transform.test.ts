import {
  transformProjectItem,
  filterItemsByTodoColumns,
  transformProject,
  groupItemsByStatus,
  calculateProjectStats,
  validateProjectData,
  sanitizeProjectData,
  normalizeProjectConfigs,
  transformProjectError,
  sortProjects,
  searchProjects
} from '../data-transform'
import { ProjectConfig, ProjectData, ProjectItem } from '@/types/github'

describe('Data Transformation utilities', () => {
  // Mock project configuration
  const mockConfig: ProjectConfig = {
    name: 'Test Project',
    owner: 'test-org',
    repo: 'test-repo',
    projectNumber: 1,
    todoColumns: ['TODO', 'Backlog']
  }

  // Mock GitHub API project item
  const mockGitHubItem = {
    id: 'ITEM_1',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    type: 'ISSUE',
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
        },
        {
          field: { name: 'Priority' },
          name: 'High'
        }
      ]
    }
  }

  // Mock GitHub API project
  const mockGitHubProject = {
    id: 'PROJECT_1',
    number: 1,
    title: 'Test Project',
    shortDescription: 'Test project description',
    readme: 'Test README',
    public: true,
    closed: false,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z',
    url: 'https://github.com/orgs/test-org/projects/1',
    owner: {
      login: 'test-org',
      avatarUrl: 'https://github.com/test-org.png',
      url: 'https://github.com/test-org'
    },
    items: {
      nodes: [mockGitHubItem]
    }
  }

  beforeEach(() => {
    // Mock console.log to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('transformProjectItem', () => {
    it('should transform a regular issue item', () => {
      const result = transformProjectItem(mockGitHubItem)

      expect(result).toEqual({
        id: 'ITEM_1',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        projectFields: [
          { name: 'Status', value: 'TODO' },
          { name: 'Priority', value: 'High' }
        ],
        title: 'Test Issue',
        body: 'Test issue body',
        url: 'https://github.com/test-org/test-repo/issues/1',
        state: 'OPEN',
        type: 'ISSUE',
        closedAt: null,
        mergedAt: undefined,
        assignees: [],
        labels: [],
        author: {
          login: 'test-user',
          avatarUrl: 'https://github.com/test-user.png',
          url: 'https://github.com/test-user'
        },
        milestone: null
      })
    })

    it('should transform a pull request item', () => {
      const prItem = {
        ...mockGitHubItem,
        type: 'PULL_REQUEST',
        content: {
          ...mockGitHubItem.content,
          mergedAt: '2023-01-03T00:00:00Z'
        }
      }

      const result = transformProjectItem(prItem)

      expect(result.type).toBe('PULL_REQUEST')
      expect(result.mergedAt).toBe('2023-01-03T00:00:00Z')
    })

    it('should handle draft issues with no content', () => {
      const draftItem = {
        ...mockGitHubItem,
        content: null,
        type: 'DRAFT_ISSUE'
      }

      const result = transformProjectItem(draftItem)

      expect(result).toEqual({
        id: 'ITEM_1',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        projectFields: [
          { name: 'Status', value: 'TODO' },
          { name: 'Priority', value: 'High' }
        ],
        title: 'Draft Item',
        body: '',
        url: '',
        state: 'OPEN',
        type: 'DRAFT_ISSUE',
        assignees: [],
        labels: [],
        author: { login: 'Unknown', avatarUrl: '', url: '' }
      })
    })

    it('should handle missing or malformed field values', () => {
      const itemWithBadFields = {
        ...mockGitHubItem,
        fieldValues: {
          nodes: [
            { field: null, name: 'TODO' },
            { field: { name: 'Priority' }, value: null },
            { field: { name: 'Number' }, number: 42 }
          ]
        }
      }

      const result = transformProjectItem(itemWithBadFields)

      expect(result.projectFields).toEqual([
        { name: 'Unknown', value: 'TODO' },
        { name: 'Priority', value: null },
        { name: 'Number', value: '42' }
      ])
    })

    it('should handle empty field values', () => {
      const itemWithoutFields = {
        ...mockGitHubItem,
        fieldValues: null
      }

      const result = transformProjectItem(itemWithoutFields)

      expect(result.projectFields).toEqual([])
    })
  })

  describe('filterItemsByTodoColumns', () => {
    const mockItems: ProjectItem[] = [
      {
        id: '1',
        title: 'TODO Item',
        body: '',
        url: '',
        state: 'OPEN',
        type: 'ISSUE',
        assignees: [],
        labels: [],
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        author: { login: 'user1', avatarUrl: '', url: '' },
        projectFields: [{ name: 'Status', value: 'TODO' }]
      },
      {
        id: '2',
        title: 'In Progress Item',
        body: '',
        url: '',
        state: 'OPEN',
        type: 'ISSUE',
        assignees: [],
        labels: [],
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        author: { login: 'user2', avatarUrl: '', url: '' },
        projectFields: [{ name: 'Status', value: 'In Progress' }]
      },
      {
        id: '3',
        title: 'Backlog Item',
        body: '',
        url: '',
        state: 'OPEN',
        type: 'ISSUE',
        assignees: [],
        labels: [],
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        author: { login: 'user3', avatarUrl: '', url: '' },
        projectFields: [{ name: 'Status', value: 'Backlog' }]
      }
    ]

    it('should filter items by TODO columns', () => {
      const result = filterItemsByTodoColumns(mockItems, ['TODO', 'Backlog'])

      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('TODO Item')
      expect(result[1].title).toBe('Backlog Item')
    })

    it('should return all items if no TODO columns specified', () => {
      const result = filterItemsByTodoColumns(mockItems, [])

      expect(result).toHaveLength(3)
    })

    it('should return empty array if no items match TODO columns', () => {
      const result = filterItemsByTodoColumns(mockItems, ['NonExistent'])

      expect(result).toHaveLength(0)
    })

    it('should handle different status field names', () => {
      const itemsWithDifferentFields = [
        {
          ...mockItems[0],
          projectFields: [{ name: 'Column', value: 'TODO' }]
        },
        {
          ...mockItems[1],
          projectFields: [{ name: 'Phase', value: 'TODO' }]
        }
      ]

      const result = filterItemsByTodoColumns(itemsWithDifferentFields, ['TODO'])

      expect(result).toHaveLength(2)
    })
  })

  describe('transformProject', () => {
    it('should transform a project with filtered items', () => {
      const result = transformProject(mockGitHubProject, mockConfig)

      expect(result.id).toBe('PROJECT_1')
      expect(result.title).toBe('Test Project')
      expect(result.projectName).toBe('Test Project')
      expect(result.projectConfig).toEqual(mockConfig)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].title).toBe('Test Issue')
      expect(result.lastFetched).toBeDefined()
    })

    it('should handle projects with no items', () => {
      const projectWithNoItems = {
        ...mockGitHubProject,
        items: { nodes: [] }
      }

      const result = transformProject(projectWithNoItems, mockConfig)

      expect(result.items).toHaveLength(0)
    })

    it('should handle closed projects', () => {
      const closedProject = {
        ...mockGitHubProject,
        closed: true
      }

      const result = transformProject(closedProject, mockConfig)

      expect(result.state).toBe('CLOSED')
    })

    it('should set repository information from config', () => {
      const result = transformProject(mockGitHubProject, mockConfig)

      expect(result.repository).toEqual({
        name: 'test-repo',
        fullName: 'test-org/test-repo',
        url: 'https://github.com/test-org/test-repo',
        description: 'Test repository'
      })
    })
  })

  describe('groupItemsByStatus', () => {
    const mockItems: ProjectItem[] = [
      {
        id: '1',
        title: 'TODO Item',
        body: '',
        url: '',
        state: 'OPEN',
        type: 'ISSUE',
        assignees: [],
        labels: [],
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        author: { login: 'user1', avatarUrl: '', url: '' },
        projectFields: [{ name: 'Status', value: 'TODO' }]
      },
      {
        id: '2',
        title: 'Another TODO Item',
        body: '',
        url: '',
        state: 'OPEN',
        type: 'ISSUE',
        assignees: [],
        labels: [],
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        author: { login: 'user2', avatarUrl: '', url: '' },
        projectFields: [{ name: 'Status', value: 'TODO' }]
      },
      {
        id: '3',
        title: 'Done Item',
        body: '',
        url: '',
        state: 'OPEN',
        type: 'ISSUE',
        assignees: [],
        labels: [],
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        author: { login: 'user3', avatarUrl: '', url: '' },
        projectFields: [{ name: 'Status', value: 'Done' }]
      }
    ]

    it('should group items by status', () => {
      const result = groupItemsByStatus(mockItems)

      expect(result.TODO).toHaveLength(2)
      expect(result.Done).toHaveLength(1)
      expect(result.TODO[0].title).toBe('TODO Item')
      expect(result.TODO[1].title).toBe('Another TODO Item')
      expect(result.Done[0].title).toBe('Done Item')
    })

    it('should handle items with no status', () => {
      const itemWithoutStatus = {
        ...mockItems[0],
        projectFields: []
      }

      const result = groupItemsByStatus([itemWithoutStatus])

      expect(result['No Status']).toHaveLength(1)
    })
  })

  describe('calculateProjectStats', () => {
    const mockProject: ProjectData = {
      id: 'PROJECT_1',
      number: 1,
      title: 'Test Project',
      url: 'https://github.com/orgs/test-org/projects/1',
      state: 'OPEN',
      public: true,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-02T00:00:00Z',
      owner: { login: 'test-org', avatarUrl: '', url: '' },
      repository: { name: 'test-repo', fullName: 'test-org/test-repo', url: '' },
      items: [
        {
          id: '1',
          title: 'TODO Issue',
          body: '',
          url: '',
          state: 'OPEN',
          type: 'ISSUE',
          assignees: [],
          labels: [],
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          author: { login: 'user1', avatarUrl: '', url: '' },
          projectFields: [{ name: 'Status', value: 'TODO' }]
        },
        {
          id: '2',
          title: 'In Progress Issue',
          body: '',
          url: '',
          state: 'OPEN',
          type: 'ISSUE',
          assignees: [],
          labels: [],
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          author: { login: 'user2', avatarUrl: '', url: '' },
          projectFields: [{ name: 'Status', value: 'In Progress' }]
        },
        {
          id: '3',
          title: 'Done Issue',
          body: '',
          url: '',
          state: 'CLOSED',
          type: 'ISSUE',
          assignees: [],
          labels: [],
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          author: { login: 'user3', avatarUrl: '', url: '' },
          projectFields: [{ name: 'Status', value: 'Done' }]
        },
        {
          id: '4',
          title: 'Test PR',
          body: '',
          url: '',
          state: 'OPEN',
          type: 'PULL_REQUEST',
          assignees: [],
          labels: [],
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          author: { login: 'user4', avatarUrl: '', url: '' },
          projectFields: [{ name: 'Status', value: 'TODO' }]
        }
      ]
    }

    it('should calculate project statistics correctly', () => {
      const result = calculateProjectStats(mockProject)

      expect(result.totalItems).toBe(4)
      expect(result.todoItems).toBe(2) // TODO issue + TODO PR
      expect(result.inProgressItems).toBe(1)
      expect(result.completedItems).toBe(1)
      expect(result.openIssues).toBe(2) // TODO issue + In Progress issue
      expect(result.pullRequests).toBe(1)
    })
  })

  describe('validateProjectData', () => {
    it('should validate correct project data', () => {
      const result = validateProjectData(mockGitHubProject)
      expect(result).toBe(true)
    })

    it('should reject project data missing required fields', () => {
      const invalidProject = { id: 'PROJECT_1' }
      const result = validateProjectData(invalidProject)
      expect(result).toBe(false)
    })

    it('should reject null project data', () => {
      const result = validateProjectData(null)
      expect(result).toBe(false)
    })
  })

  describe('sanitizeProjectData', () => {
    const mockProject: ProjectData = {
      id: 'PROJECT_1',
      number: 1,
      title: 'Test Project',
      url: 'https://github.com/orgs/test-org/projects/1',
      state: 'OPEN',
      public: true,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-02T00:00:00Z',
      owner: { login: 'test-org', avatarUrl: '', url: '' },
      repository: { name: 'test-repo', fullName: 'test-org/test-repo', url: '' },
      items: [
        {
          id: '1',
          title: 'Test Issue',
          body: 'This is a very long body that should be truncated because it contains sensitive information and we want to keep the display clean'.repeat(5),
          url: '',
          state: 'OPEN',
          type: 'ISSUE',
          assignees: [],
          labels: [],
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          author: { login: 'user1', avatarUrl: '', url: '' },
          projectFields: [
            { name: 'Status', value: 'TODO' },
            { name: 'SensitiveField', value: 'secret' },
            { name: 'Priority', value: 'High' }
          ]
        }
      ]
    }

    it('should sanitize project data', () => {
      const result = sanitizeProjectData(mockProject)

      expect(result.items[0].body).toHaveLength(203) // 200 chars + "..."
      expect(result.items[0].body.endsWith('...')).toBe(true)
      expect(result.items[0].projectFields).toHaveLength(2) // Only Status and Priority
      expect(result.items[0].projectFields.find(f => f.name === 'SensitiveField')).toBeUndefined()
    })
  })

  describe('normalizeProjectConfigs', () => {
    it('should normalize project configurations', () => {
      const configs = [
        { owner: 'org1', projectNumber: 1 },
        { owner: 'org2', projectNumber: 2, name: 'Custom Name', repo: 'custom-repo', todoColumns: ['Custom'] }
      ] as ProjectConfig[]

      const result = normalizeProjectConfigs(configs)

      expect(result[0]).toEqual({
        owner: 'org1',
        projectNumber: 1,
        name: 'org1/unknown-repo',
        repo: 'unknown-repo',
        todoColumns: ['TODO']
      })

      expect(result[1]).toEqual({
        owner: 'org2',
        projectNumber: 2,
        name: 'Custom Name',
        repo: 'custom-repo',
        todoColumns: ['Custom']
      })
    })
  })

  describe('transformProjectError', () => {
    it('should transform error information', () => {
      const error = new Error('Test error')
      const result = transformProjectError(error, 'Test Project')

      expect(result.projectName).toBe('Test Project')
      expect(result.error).toBe('Test error')
      expect(result.timestamp).toBeDefined()
    })

    it('should handle errors without message', () => {
      const error = {}
      const result = transformProjectError(error, 'Test Project')

      expect(result.error).toBe('Unknown error')
    })
  })

  describe('sortProjects', () => {
    const mockProjects: ProjectData[] = [
      {
        id: 'PROJECT_1',
        number: 1,
        title: 'Z Project',
        url: '',
        state: 'OPEN',
        public: true,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        owner: { login: 'test-org', avatarUrl: '', url: '' },
        repository: { name: 'test-repo', fullName: 'test-org/test-repo', url: '' },
        items: [{ id: '1' }] as ProjectItem[],
        projectName: 'Z Project'
      },
      {
        id: 'PROJECT_2',
        number: 2,
        title: 'A Project',
        url: '',
        state: 'OPEN',
        public: true,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-03T00:00:00Z',
        owner: { login: 'test-org', avatarUrl: '', url: '' },
        repository: { name: 'test-repo', fullName: 'test-org/test-repo', url: '' },
        items: [{ id: '1' }, { id: '2' }, { id: '3' }] as ProjectItem[],
        projectName: 'A Project'
      }
    ]

    it('should sort projects by name', () => {
      const result = sortProjects(mockProjects, 'name')

      expect(result[0].projectName).toBe('A Project')
      expect(result[1].projectName).toBe('Z Project')
    })

    it('should sort projects by updated date', () => {
      const result = sortProjects(mockProjects, 'updated')

      expect(result[0].projectName).toBe('A Project') // More recent
      expect(result[1].projectName).toBe('Z Project')
    })

    it('should sort projects by item count', () => {
      const result = sortProjects(mockProjects, 'items')

      expect(result[0].projectName).toBe('A Project') // More items
      expect(result[1].projectName).toBe('Z Project')
    })
  })

  describe('searchProjects', () => {
    const mockProjects: ProjectData[] = [
      {
        id: 'PROJECT_1',
        number: 1,
        title: 'Frontend Project',
        description: 'React application',
        url: '',
        state: 'OPEN',
        public: true,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        owner: { login: 'test-org', avatarUrl: '', url: '' },
        repository: { name: 'test-repo', fullName: 'test-org/test-repo', url: '' },
        items: [
          {
            id: '1',
            title: 'Add React components',
            body: 'Create new components for the UI',
            url: '',
            state: 'OPEN',
            type: 'ISSUE',
            assignees: [],
            labels: [],
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
            author: { login: 'user1', avatarUrl: '', url: '' },
            projectFields: []
          }
        ],
        projectName: 'Frontend Project'
      },
      {
        id: 'PROJECT_2',
        number: 2,
        title: 'Backend API',
        description: 'Node.js API',
        url: '',
        state: 'OPEN',
        public: true,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        owner: { login: 'test-org', avatarUrl: '', url: '' },
        repository: { name: 'test-repo', fullName: 'test-org/test-repo', url: '' },
        items: [
          {
            id: '2',
            title: 'Database setup',
            body: 'Configure PostgreSQL database',
            url: '',
            state: 'OPEN',
            type: 'ISSUE',
            assignees: [],
            labels: [],
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
            author: { login: 'user2', avatarUrl: '', url: '' },
            projectFields: []
          }
        ],
        projectName: 'Backend API'
      }
    ]

    it('should search projects by title', () => {
      const result = searchProjects(mockProjects, 'frontend')

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Frontend Project')
    })

    it('should search projects by description', () => {
      const result = searchProjects(mockProjects, 'react')

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Frontend Project')
    })

    it('should search projects by item content', () => {
      const result = searchProjects(mockProjects, 'database')

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Backend API')
    })

    it('should return all projects for empty search', () => {
      const result = searchProjects(mockProjects, '')

      expect(result).toHaveLength(2)
    })

    it('should return no projects for non-matching search', () => {
      const result = searchProjects(mockProjects, 'nonexistent')

      expect(result).toHaveLength(0)
    })
  })
})