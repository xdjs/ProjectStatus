import React from 'react'
import { render, screen } from '@testing-library/react'
import { ProjectSection } from '../ProjectSection'
import { ProjectData } from '@/types/github'

// Mock ProjectItemCard component
jest.mock('../ProjectItemCard', () => ({
  ProjectItemCard: ({ item }) => (
    <div data-testid={`project-item-${item.id}`}>
      <h3>{item.title}</h3>
      <p>{item.type}</p>
    </div>
  )
}))

describe('ProjectSection', () => {
  const mockProject: ProjectData = {
    id: 'PROJECT_1',
    number: 1,
    title: 'Test Project',
    description: 'Test project description',
    url: 'https://github.com/orgs/test/projects/1',
    state: 'OPEN',
    public: true,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z',
    owner: { login: 'test-org', avatarUrl: '', url: '' },
    repository: { name: 'test-repo', fullName: 'test-org/test-repo', url: '' },
    items: [
      {
        id: '1',
        title: 'TODO Item 1',
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
        title: 'TODO Item 2',
        body: '',
        url: '',
        state: 'OPEN',
        type: 'ISSUE',
        assignees: [],
        labels: [],
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        author: { login: 'user2', avatarUrl: '', url: '' },
        projectFields: [{ name: 'Status', value: 'Backlog' }]
      },
      {
        id: '3',
        title: 'In Progress Item',
        body: '',
        url: '',
        state: 'OPEN',
        type: 'ISSUE',
        assignees: [],
        labels: [],
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        author: { login: 'user3', avatarUrl: '', url: '' },
        projectFields: [{ name: 'Status', value: 'In Progress' }]
      },
      {
        id: '4',
        title: 'Done Item',
        body: '',
        url: '',
        state: 'CLOSED',
        type: 'ISSUE',
        assignees: [],
        labels: [],
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        author: { login: 'user4', avatarUrl: '', url: '' },
        projectFields: [{ name: 'Status', value: 'Done' }]
      }
    ],
    projectName: 'Test Project',
    projectConfig: {
      name: 'Test Project',
      owner: 'test-org',
      repo: 'test-repo',
      projectNumber: 1,
      todoColumns: ['TODO', 'Backlog']
    }
  }

  beforeEach(() => {
    // Mock console.log to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Project header', () => {
    it('should display project name and description', () => {
      render(<ProjectSection project={mockProject} />)
      
      expect(screen.getByText('Test Project')).toBeInTheDocument()
      expect(screen.getByText('Test project description')).toBeInTheDocument()
    })

    it('should fall back to title when projectName is not available', () => {
      const projectWithoutName = {
        ...mockProject,
        projectName: undefined
      }
      
      render(<ProjectSection project={projectWithoutName} />)
      
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    it('should fall back to owner/repo when description is not available', () => {
      const projectWithoutDescription = {
        ...mockProject,
        description: undefined
      }
      
      render(<ProjectSection project={projectWithoutDescription} />)
      
      expect(screen.getByText('test-org/test-repo')).toBeInTheDocument()
    })

    it('should display correct TODO item count', () => {
      render(<ProjectSection project={mockProject} />)
      
      expect(screen.getByText('2')).toBeInTheDocument() // TODO Items count
      expect(screen.getByText('TODO Items')).toBeInTheDocument()
    })

    it('should display correct total item count', () => {
      render(<ProjectSection project={mockProject} />)
      
      expect(screen.getByText('4')).toBeInTheDocument() // Total Items count
      expect(screen.getByText('Total Items')).toBeInTheDocument()
    })
  })

  describe('TODO filtering', () => {
    it('should only display items in configured TODO columns', () => {
      render(<ProjectSection project={mockProject} />)
      
      // Should show TODO and Backlog items
      expect(screen.getByTestId('project-item-1')).toBeInTheDocument()
      expect(screen.getByTestId('project-item-2')).toBeInTheDocument()
      
      // Should not show In Progress or Done items
      expect(screen.queryByTestId('project-item-3')).not.toBeInTheDocument()
      expect(screen.queryByTestId('project-item-4')).not.toBeInTheDocument()
    })

    it('should use default TODO column when no configuration provided', () => {
      const projectWithoutConfig = {
        ...mockProject,
        projectConfig: undefined
      }
      
      render(<ProjectSection project={projectWithoutConfig} />)
      
      // Should only show TODO items, not Backlog
      expect(screen.getByTestId('project-item-1')).toBeInTheDocument()
      expect(screen.queryByTestId('project-item-2')).not.toBeInTheDocument()
    })

    it('should handle empty TODO columns configuration', () => {
      const projectWithEmptyConfig = {
        ...mockProject,
        projectConfig: {
          ...mockProject.projectConfig!,
          todoColumns: []
        }
      }
      
      render(<ProjectSection project={projectWithEmptyConfig} />)
      
      // Should use default TODO column
      expect(screen.getByTestId('project-item-1')).toBeInTheDocument()
      expect(screen.queryByTestId('project-item-2')).not.toBeInTheDocument()
    })
  })

  describe('Column display', () => {
    it('should display columns for TODO items', () => {
      render(<ProjectSection project={mockProject} />)
      
      expect(screen.getByText('TODO')).toBeInTheDocument()
      expect(screen.getByText('Backlog')).toBeInTheDocument()
    })

    it('should display item count for each column', () => {
      render(<ProjectSection project={mockProject} />)
      
      // Check for count badges
      const countBadges = screen.getAllByText('1')
      expect(countBadges).toHaveLength(2) // One for TODO, one for Backlog
    })

    it('should not display columns without items', () => {
      const projectWithOnlyTodo = {
        ...mockProject,
        items: [mockProject.items[0]], // Only TODO item
        projectConfig: {
          ...mockProject.projectConfig!,
          todoColumns: ['TODO', 'Backlog', 'Ready']
        }
      }
      
      render(<ProjectSection project={projectWithOnlyTodo} />)
      
      expect(screen.getByText('TODO')).toBeInTheDocument()
      expect(screen.queryByText('BACKLOG')).not.toBeInTheDocument()
      expect(screen.queryByText('READY')).not.toBeInTheDocument()
    })
  })

  describe('Empty states', () => {
    it('should display empty state when no TODO items exist', () => {
      const projectWithNoTodos = {
        ...mockProject,
        items: [mockProject.items[2], mockProject.items[3]], // Only In Progress and Done items
        projectConfig: {
          ...mockProject.projectConfig!,
          todoColumns: ['TODO', 'Backlog']
        }
      }
      
      render(<ProjectSection project={projectWithNoTodos} />)
      
      expect(screen.getByText('No TODO items in configured columns')).toBeInTheDocument()
      expect(screen.getByText('Configured columns: TODO, Backlog')).toBeInTheDocument()
    })

    it('should display empty column message for columns without items', () => {
      const projectWithPartialTodos = {
        ...mockProject,
        items: [mockProject.items[0]], // Only TODO item
        projectConfig: {
          ...mockProject.projectConfig!,
          todoColumns: ['TODO', 'Backlog']
        }
      }
      
      render(<ProjectSection project={projectWithPartialTodos} />)
      
      expect(screen.getByText('TODO')).toBeInTheDocument()
      expect(screen.queryByText('BACKLOG')).not.toBeInTheDocument() // Should not show empty columns
    })
  })

  describe('Field name variations', () => {
    it('should handle different status field names', () => {
      const projectWithDifferentFields = {
        ...mockProject,
        items: [
          {
            ...mockProject.items[0],
            projectFields: [{ name: 'Column', value: 'TODO' }]
          },
          {
            ...mockProject.items[1],
            projectFields: [{ name: 'Phase', value: 'Backlog' }]
          },
          {
            ...mockProject.items[2],
            projectFields: [{ name: 'Stage', value: 'TODO' }]
          }
        ]
      }
      
      render(<ProjectSection project={projectWithDifferentFields} />)
      
      // Should show all 3 items (2 TODO, 1 Backlog)
      expect(screen.getByTestId('project-item-1')).toBeInTheDocument()
      expect(screen.getByTestId('project-item-2')).toBeInTheDocument()
      expect(screen.getByTestId('project-item-3')).toBeInTheDocument()
    })

    it('should handle items without status fields', () => {
      const projectWithItemsWithoutStatus = {
        ...mockProject,
        items: [
          {
            ...mockProject.items[0],
            projectFields: [] // No status field
          },
          {
            ...mockProject.items[1],
            projectFields: [{ name: 'Status', value: 'TODO' }]
          }
        ]
      }
      
      render(<ProjectSection project={projectWithItemsWithoutStatus} />)
      
      // Should only show the item with TODO status
      expect(screen.queryByTestId('project-item-1')).not.toBeInTheDocument()
      expect(screen.getByTestId('project-item-2')).toBeInTheDocument()
    })
  })
})