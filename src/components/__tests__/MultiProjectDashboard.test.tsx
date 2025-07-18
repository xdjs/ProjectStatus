import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MultiProjectDashboard } from '../MultiProjectDashboard'
import { MultiProjectData, ProjectData } from '@/types/github'

// Mock ProjectSection component
jest.mock('../ProjectSection', () => ({
  ProjectSection: ({ project }) => (
    <div data-testid={`project-section-${project.id}`}>
      <h2>{project.projectName}</h2>
      <p>{project.items.length} items</p>
    </div>
  )
}))

describe('MultiProjectDashboard', () => {
  const mockOnReconfigure = jest.fn()
  
  const mockSingleProject: ProjectData = {
    id: 'PROJECT_1',
    number: 1,
    title: 'Test Project',
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
        title: 'Done Item',
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
      }
    ],
    projectName: 'Test Project',
    projectConfig: {
      name: 'Test Project',
      owner: 'test-org',
      repo: 'test-repo',
      projectNumber: 1,
      todoColumns: ['TODO']
    }
  }
  
  const mockMultiProjectData: MultiProjectData = {
    projects: [mockSingleProject],
    lastFetched: '2023-01-01T00:00:00Z',
    errors: []
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock console.log to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Loading and error states', () => {
    it('should display no data message when multiProjectData is null', () => {
      render(
        <MultiProjectDashboard 
          multiProjectData={null} 
          loading={false} 
          error={null} 
          onReconfigure={mockOnReconfigure} 
        />
      )
      
      expect(screen.getByText('No project data available')).toBeInTheDocument()
    })

    it('should display error state when all projects fail to load', () => {
      const errorData: MultiProjectData = {
        projects: [],
        lastFetched: '2023-01-01T00:00:00Z',
        errors: [
          { projectName: 'Project A', error: 'API Error' },
          { projectName: 'Project B', error: 'Token Invalid' }
        ]
      }
      
      render(
        <MultiProjectDashboard 
          multiProjectData={errorData} 
          loading={false} 
          error={null} 
          onReconfigure={mockOnReconfigure} 
        />
      )
      
      expect(screen.getByText('Failed to Load Projects')).toBeInTheDocument()
      expect(screen.getByText('Project A')).toBeInTheDocument()
      expect(screen.getByText('API Error')).toBeInTheDocument()
      expect(screen.getByText('Project B')).toBeInTheDocument()
      expect(screen.getByText('Token Invalid')).toBeInTheDocument()
    })

    it('should call onReconfigure when retry button is clicked in error state', () => {
      const errorData: MultiProjectData = {
        projects: [],
        lastFetched: '2023-01-01T00:00:00Z',
        errors: [{ projectName: 'Project A', error: 'API Error' }]
      }
      
      render(
        <MultiProjectDashboard 
          multiProjectData={errorData} 
          loading={false} 
          error={null} 
          onReconfigure={mockOnReconfigure} 
        />
      )
      
      const retryButton = screen.getByText('Retry')
      fireEvent.click(retryButton)
      
      expect(mockOnReconfigure).toHaveBeenCalledTimes(1)
    })
  })

  describe('Single project display', () => {
    it('should display single project correctly', () => {
      render(
        <MultiProjectDashboard 
          multiProjectData={mockMultiProjectData} 
          loading={false} 
          error={null} 
          onReconfigure={mockOnReconfigure} 
        />
      )
      
      expect(screen.getByText('Multi-Project Dashboard')).toBeInTheDocument()
      expect(screen.getByText('1 project loaded')).toBeInTheDocument()
      expect(screen.getByTestId('project-section-PROJECT_1')).toBeInTheDocument()
    })

    it('should display correct statistics for single project', () => {
      render(
        <MultiProjectDashboard 
          multiProjectData={mockMultiProjectData} 
          loading={false} 
          error={null} 
          onReconfigure={mockOnReconfigure} 
        />
      )
      
      expect(screen.getByText('TODO Items')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
      
      // Check that the correct numbers are displayed in the stats
      const todoStat = screen.getByText('TODO Items').previousElementSibling
      const inProgressStat = screen.getByText('In Progress').previousElementSibling
      const completedStat = screen.getByText('Completed').previousElementSibling
      
      expect(todoStat).toHaveTextContent('1')
      expect(inProgressStat).toHaveTextContent('1')
      expect(completedStat).toHaveTextContent('1')
    })
  })

  describe('Multiple project display', () => {
    const mockMultipleProjects: MultiProjectData = {
      projects: [
        {
          ...mockSingleProject,
          id: 'PROJECT_1',
          projectName: 'Project A',
          items: [
            {
              ...mockSingleProject.items[0],
              id: '1a',
              projectFields: [{ name: 'Status', value: 'TODO' }]
            },
            {
              ...mockSingleProject.items[1],
              id: '2a',
              projectFields: [{ name: 'Status', value: 'TODO' }]
            }
          ]
        },
        {
          ...mockSingleProject,
          id: 'PROJECT_2',
          projectName: 'Project B',
          items: [
            {
              ...mockSingleProject.items[0],
              id: '1b',
              projectFields: [{ name: 'Status', value: 'In Progress' }]
            },
            {
              ...mockSingleProject.items[2],
              id: '3b',
              projectFields: [{ name: 'Status', value: 'Done' }]
            }
          ]
        }
      ],
      lastFetched: '2023-01-01T00:00:00Z',
      errors: []
    }

    it('should display multiple projects in grid layout', () => {
      render(
        <MultiProjectDashboard 
          multiProjectData={mockMultipleProjects} 
          loading={false} 
          error={null} 
          onReconfigure={mockOnReconfigure} 
        />
      )
      
      expect(screen.getByText('2 projects loaded')).toBeInTheDocument()
      expect(screen.getByTestId('project-section-PROJECT_1')).toBeInTheDocument()
      expect(screen.getByTestId('project-section-PROJECT_2')).toBeInTheDocument()
    })

    it('should display correct aggregate statistics', () => {
      render(
        <MultiProjectDashboard 
          multiProjectData={mockMultipleProjects} 
          loading={false} 
          error={null} 
          onReconfigure={mockOnReconfigure} 
        />
      )
      
      expect(screen.getByText('TODO Items')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
      
      // Check that the correct numbers are displayed in the stats
      const todoStat = screen.getByText('TODO Items').previousElementSibling
      const inProgressStat = screen.getByText('In Progress').previousElementSibling
      const completedStat = screen.getByText('Completed').previousElementSibling
      
      expect(todoStat).toHaveTextContent('2') // 2 TODO items (both from Project A)
      expect(inProgressStat).toHaveTextContent('1') // 1 In Progress item (from Project B)
      expect(completedStat).toHaveTextContent('1') // 1 Completed item (from Project B)
    })
  })

  describe('Partial failures', () => {
    it('should display projects with errors notification', () => {
      const partialFailureData: MultiProjectData = {
        projects: [mockSingleProject],
        lastFetched: '2023-01-01T00:00:00Z',
        errors: [
          { projectName: 'Failed Project', error: 'Connection timeout' }
        ]
      }
      
      render(
        <MultiProjectDashboard 
          multiProjectData={partialFailureData} 
          loading={false} 
          error={null} 
          onReconfigure={mockOnReconfigure} 
        />
      )
      
      expect(screen.getByText('1 project loaded • 1 error')).toBeInTheDocument()
      expect(screen.getByText('⚠️ Some projects failed to load:')).toBeInTheDocument()
      expect(screen.getByText('Failed Project')).toBeInTheDocument()
    })

    it('should handle plural forms correctly', () => {
      const multipleErrorsData: MultiProjectData = {
        projects: [mockSingleProject],
        lastFetched: '2023-01-01T00:00:00Z',
        errors: [
          { projectName: 'Failed Project 1', error: 'Error 1' },
          { projectName: 'Failed Project 2', error: 'Error 2' }
        ]
      }
      
      render(
        <MultiProjectDashboard 
          multiProjectData={multipleErrorsData} 
          loading={false} 
          error={null} 
          onReconfigure={mockOnReconfigure} 
        />
      )
      
      expect(screen.getByText('1 project loaded • 2 errors')).toBeInTheDocument()
    })
  })

  describe('Empty state', () => {
    it('should display empty state when no projects are available', () => {
      const emptyData: MultiProjectData = {
        projects: [],
        lastFetched: '2023-01-01T00:00:00Z',
        errors: []
      }
      
      render(
        <MultiProjectDashboard 
          multiProjectData={emptyData} 
          loading={false} 
          error={null} 
          onReconfigure={mockOnReconfigure} 
        />
      )
      
      expect(screen.getByText('No projects to display')).toBeInTheDocument()
    })
  })
})