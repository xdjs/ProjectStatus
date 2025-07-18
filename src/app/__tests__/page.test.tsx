import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { act } from 'react'
import Home from '../page'

// Mock the dashboard components
jest.mock('@/components/ProjectDashboard', () => ({
  ProjectDashboard: ({ projectData, loading, error, onReconfigure }: any) => (
    <div data-testid="project-dashboard">
      <div>Single Project Dashboard</div>
      {projectData && <div>Project: {projectData.title}</div>}
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      <button onClick={onReconfigure}>Reconfigure</button>
    </div>
  )
}))

jest.mock('@/components/MultiProjectDashboard', () => ({
  MultiProjectDashboard: ({ multiProjectData, loading, error, onReconfigure }: any) => (
    <div data-testid="multi-project-dashboard">
      <div>Multi-Project Dashboard</div>
      {multiProjectData && <div>Projects: {multiProjectData.projects.length}</div>}
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      <button onClick={onReconfigure}>Reconfigure</button>
    </div>
  )
}))

// Mock EventSource
const mockEventSource = {
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  onopen: null,
  onmessage: null,
  onerror: null,
  readyState: 1,
  url: '',
  withCredentials: false,
  CLOSED: 2,
  CONNECTING: 0,
  OPEN: 1
}

const mockWakeLock = {
  request: jest.fn().mockResolvedValue({
    release: jest.fn()
  })
}

// Mock Navigator API
Object.defineProperty(navigator, 'wakeLock', {
  value: mockWakeLock,
  writable: true
})

global.EventSource = jest.fn().mockImplementation(() => mockEventSource)
global.fetch = jest.fn()

// Mock console methods
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn()
}

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  const mockMultiProjectData = {
    projects: [
      {
        id: 'project1',
        number: 1,
        title: 'Test Project 1',
        description: 'Test project description',
        url: 'https://github.com/test/project1',
        state: 'OPEN',
        public: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastFetched: '2024-01-01T00:00:00Z',
        owner: { login: 'test', avatarUrl: '', url: '' },
        repository: { name: 'test', fullName: 'test/test', url: '', description: '' },
        items: [
          { 
            id: '1', 
            title: 'Item 1', 
            body: '',
            url: '',
            state: 'OPEN',
            type: 'ISSUE',
            assignees: [],
            labels: [],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            author: { login: 'test', avatarUrl: '', url: '' },
            projectFields: [{ name: 'Status', value: 'TODO' }] 
          }
        ],
        projectName: 'Test Project 1',
        projectConfig: { name: 'Test Project 1', owner: 'test', repo: 'test', projectNumber: 1, todoColumns: ['TODO'] }
      },
      {
        id: 'project2',
        number: 2,
        title: 'Test Project 2',
        description: 'Test project description',
        url: 'https://github.com/test/project2',
        state: 'OPEN',
        public: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastFetched: '2024-01-01T00:00:00Z',
        owner: { login: 'test', avatarUrl: '', url: '' },
        repository: { name: 'test', fullName: 'test/test', url: '', description: '' },
        items: [
          { 
            id: '2', 
            title: 'Item 2', 
            body: '',
            url: '',
            state: 'OPEN',
            type: 'ISSUE',
            assignees: [],
            labels: [],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            author: { login: 'test', avatarUrl: '', url: '' },
            projectFields: [{ name: 'Status', value: 'Done' }] 
          }
        ],
        projectName: 'Test Project 2',
        projectConfig: { name: 'Test Project 2', owner: 'test', repo: 'test', projectNumber: 2, todoColumns: ['TODO'] }
      }
    ],
    lastFetched: '2024-01-01T00:00:00Z',
    errors: []
  }

  const mockSingleProjectData = {
    id: 'project1',
    number: 1,
    title: 'Test Project',
    description: 'Test project description',
    url: 'https://github.com/test/project1',
    state: 'OPEN',
    public: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastFetched: '2024-01-01T00:00:00Z',
    owner: { login: 'test', avatarUrl: '', url: '' },
    repository: { name: 'test', fullName: 'test/test', url: '', description: '' },
    items: [
      { 
        id: '1', 
        title: 'Item 1', 
        body: '',
        url: '',
        state: 'OPEN',
        type: 'ISSUE',
        assignees: [],
        labels: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        author: { login: 'test', avatarUrl: '', url: '' },
        projectFields: [{ name: 'Status', value: 'TODO' }] 
      }
    ]
  }

  describe('Multi-project mode', () => {
    it('should render MultiProjectDashboard when multi-project API succeeds', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMultiProjectData
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByTestId('multi-project-dashboard')).toBeInTheDocument()
      })

      expect(screen.getByText('Multi-Project Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Projects: 2')).toBeInTheDocument()
    })

    it('should handle multi-project data with errors', async () => {
      const multiProjectDataWithErrors = {
        projects: [mockMultiProjectData.projects[0]],
        lastFetched: '2024-01-01T00:00:00Z',
        errors: [
          { projectName: 'Failed Project', error: 'API Error' }
        ]
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => multiProjectDataWithErrors
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByTestId('multi-project-dashboard')).toBeInTheDocument()
      })

      expect(screen.getByText('Projects: 1')).toBeInTheDocument()
    })
  })

  describe('Single-project fallback', () => {
    it('should fallback to single-project when multi-project fails', async () => {
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 404
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSingleProjectData
        })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByTestId('project-dashboard')).toBeInTheDocument()
      })

      expect(screen.getByText('Single Project Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Project: Test Project')).toBeInTheDocument()
    })

    it('should handle single-project data correctly', async () => {
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 404
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSingleProjectData
        })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByTestId('project-dashboard')).toBeInTheDocument()
      })

      expect(fetch).toHaveBeenCalledTimes(2)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/projects?t='),
        expect.any(Object)
      )
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/github-project?t='),
        expect.any(Object)
      )
    })
  })

  describe('Error states', () => {
    it('should show error state when both APIs fail', async () => {
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 404
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Server Error' })
        })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })

      expect(screen.getByText('Error: Server Error')).toBeInTheDocument()
    })

    it('should allow retry from error state', async () => {
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 404
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Server Error' })
        })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMultiProjectData
      })

      act(() => {
        screen.getByText('Retry').click()
      })

      await waitFor(() => {
        expect(screen.getByTestId('multi-project-dashboard')).toBeInTheDocument()
      })
    })

    it('should handle unknown data format', async () => {
      const invalidData = { invalid: 'data' }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => invalidData
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByText('Invalid data format received')).toBeInTheDocument()
      })
    })
  })

  describe('Real-time updates', () => {
    it('should set up EventSource connection', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMultiProjectData
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByTestId('multi-project-dashboard')).toBeInTheDocument()
      })

      expect(EventSource).toHaveBeenCalledWith('/api/events')
    })

    it('should refresh data on project_item_updated event', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMultiProjectData
      })

      render(<Home />)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(1)
      })

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMultiProjectData
      })

      // Simulate EventSource message
      act(() => {
        if (mockEventSource.onmessage) {
          mockEventSource.onmessage({
            data: JSON.stringify({ type: 'project_item_updated' })
          } as MessageEvent)
        }
      })

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Component interactions', () => {
    it('should handle reconfigure button click in multi-project mode', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMultiProjectData
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByTestId('multi-project-dashboard')).toBeInTheDocument()
      })

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMultiProjectData
      })

      act(() => {
        screen.getByText('Reconfigure').click()
      })

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2)
      })
    })

    it('should handle reconfigure button click in single-project mode', async () => {
      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 404
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSingleProjectData
        })

      render(<Home />)

      await waitFor(() => {
        expect(screen.getByTestId('project-dashboard')).toBeInTheDocument()
      })

      ;(fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 404
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSingleProjectData
        })

      act(() => {
        screen.getByText('Reconfigure').click()
      })

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(4)
      })
    })
  })

  describe('Wake lock', () => {
    it('should request wake lock on mount', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMultiProjectData
      })

      render(<Home />)

      await waitFor(() => {
        expect(mockWakeLock.request).toHaveBeenCalledWith('screen')
      })
    })
  })

  describe('Loading states', () => {
    it('should show loading state initially', async () => {
      ;(fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {}))

      render(<Home />)

      expect(screen.getByText('Loading project data...')).toBeInTheDocument()
    })

    it('should hide loading state after data loads', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMultiProjectData
      })

      render(<Home />)

      await waitFor(() => {
        expect(screen.queryByText('Loading project data...')).not.toBeInTheDocument()
      })
    })
  })
})