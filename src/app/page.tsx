'use client'

import React, { useState, useEffect } from 'react'
import { ProjectDashboard } from '@/components/ProjectDashboard'
import { MultiProjectDashboard } from '@/components/MultiProjectDashboard'
import { ProjectData, MultiProjectData } from '@/types/github'

// Union type for the data that can be received
type DashboardData = ProjectData | MultiProjectData

// Type guards to distinguish between single and multi-project data
function isMultiProjectData(data: DashboardData): data is MultiProjectData {
  return 'projects' in data && Array.isArray((data as MultiProjectData).projects) && 'errors' in data
}

function isSingleProjectData(data: DashboardData): data is ProjectData {
  return 'items' in data && Array.isArray((data as ProjectData).items) && 'title' in data && !('projects' in data)
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMultiProject, setIsMultiProject] = useState(false)

  // Debug: Track when data state changes
  useEffect(() => {
    if (data && isMultiProjectData(data)) {
      console.log('Multi-project data changed:', {
        hasData: !!data,
        projectCount: data?.projects?.length || 0,
        lastFetched: data?.lastFetched,
        errorCount: data?.errors?.length || 0
      })
    } else if (data && isSingleProjectData(data)) {
      console.log('Single-project data changed:', {
        hasData: !!data,
        itemCount: data?.items?.length || 0,
        lastFetched: data?.lastFetched,
        title: data?.title
      })
    }
  }, [data])

  useEffect(() => {
    const fetchProjectData = async () => {
      setLoading(true)
      setError(null)
      console.log('Fetching project data...', new Date().toISOString())

      try {
        const timestamp = new Date().getTime()
        
        // Try multi-project endpoint first
        let response = await fetch(`/api/projects?t=${timestamp}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
        })

        if (response.ok) {
          // Multi-project mode
          const multiProjectData = await response.json()
          console.log('Multi-project data received:', {
            lastFetched: multiProjectData.lastFetched || new Date().toISOString(),
            projectCount: multiProjectData.projects?.length || 0,
            errorCount: multiProjectData.errors?.length || 0
          })
          
          setData(multiProjectData)
          setIsMultiProject(true)
          console.log('Multi-project data state updated')
        } else {
          // Try single-project endpoint as fallback
          console.log('Multi-project API failed, trying single-project fallback...')
          response = await fetch(`/api/github-project?t=${timestamp}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            },
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
          }

          const singleProjectData = await response.json()
          console.log('Single-project data received:', {
            lastFetched: singleProjectData.lastFetched || new Date().toISOString(),
            totalItems: singleProjectData.items?.length || 0,
            title: singleProjectData.title
          })
          
          // Log status distribution for debugging
          const statusCounts = singleProjectData.items?.reduce((acc: any, item: any) => {
            const status = item.projectFields?.find((field: any) => field.name === 'Status')?.value || 'No Status'
            acc[status] = (acc[status] || 0) + 1
            return acc
          }, {}) || {}
          console.log('Status distribution:', statusCounts)
          
          setData(singleProjectData)
          setIsMultiProject(false)
          console.log('Single-project data state updated')
        }
        
      } catch (err) {
        console.error('Error fetching project data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch project data')
      } finally {
        setLoading(false)
      }
    }

    fetchProjectData()
    
    // Set up Server-Sent Events for real-time updates
    console.log('Setting up Server-Sent Events connection...')
    const eventSource = new EventSource('/api/events')
    
    eventSource.onopen = (event) => {
      console.log('SSE connection opened:', event)
    }
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log('Real-time event received:', data)
      
      if (data.type === 'project_item_updated') {
        console.log('Project item updated, refreshing data...')
        fetchProjectData()
      } else if (data.type === 'connected') {
        console.log('SSE connection established successfully')
      } else if (data.type === 'heartbeat') {
        console.log('SSE heartbeat received')
      }
    }
    
    eventSource.onerror = (error) => {
      console.error('EventSource error:', error)
      console.log('SSE connection failed, falling back to polling...')
    }
    
    // Set up polling as fallback (every 10 seconds for responsiveness to column changes)
    const interval = setInterval(fetchProjectData, 10000)
    
    // Keep screen awake for TV display
    let wakeLock: WakeLockSentinel | null = null
    
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen')
          console.log('Screen wake lock activated')
        }
      } catch (err) {
        console.log('Wake lock failed:', err)
      }
    }
    
    requestWakeLock()
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && wakeLock === null) {
        requestWakeLock()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearInterval(interval)
      eventSource.close()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (wakeLock) {
        wakeLock.release()
      }
    }
  }, [])

  if (loading && !data) {
    return <LoadingState />
  }

  const handleReconfigure = async () => {
    setLoading(true)
    setError(null)
    setData(null)
    setIsMultiProject(false)
    
    // Re-fetch data immediately
    try {
      const timestamp = new Date().getTime()
      
      // Try multi-project endpoint first
      let response = await fetch(`/api/projects?t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
      })

      if (response.ok) {
        // Multi-project mode
        const multiProjectData = await response.json()
        setData(multiProjectData)
        setIsMultiProject(true)
      } else {
        // Try single-project endpoint as fallback
        response = await fetch(`/api/github-project?t=${timestamp}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }

        const singleProjectData = await response.json()
        setData(singleProjectData)
        setIsMultiProject(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project data')
    } finally {
      setLoading(false)
    }
  }

  if (error && !data) {
    return <ErrorState error={error} onRetry={handleReconfigure} />
  }

  // Debug render logic
  console.log('Render state:', {
    isMultiProject,
    hasData: !!data,
    isMultiProjectData: data ? isMultiProjectData(data) : false,
    isSingleProjectData: data ? isSingleProjectData(data) : false,
    dataKeys: data ? Object.keys(data) : []
  })

  return (
    <main className="w-full min-h-screen">
      {isMultiProject && data && isMultiProjectData(data) ? (
        <MultiProjectDashboard 
          multiProjectData={data} 
          loading={loading}
          error={error}
          onReconfigure={handleReconfigure}
        />
      ) : data && isSingleProjectData(data) ? (
        <ProjectDashboard 
          projectData={data} 
          loading={loading}
          error={error}
          onReconfigure={handleReconfigure}
        />
      ) : (
        <div className="text-center py-12">
          <p className="text-destructive">Invalid data format received</p>
          <button
            onClick={handleReconfigure}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      )}
    </main>
  )
}

function LoadingState() {
  return (
    <main className="w-full min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading project data...</p>
      </div>
    </main>
  )
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <main className="w-full min-h-screen flex items-center justify-center">
      <div className="text-center max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-4">Configuration Required</h1>
        <p className="text-destructive mb-4">Error: {error}</p>
        <div className="bg-muted p-4 rounded-lg text-sm text-left">
          <p className="font-medium mb-2">Site administrator needs to configure:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>GITHUB_TOKEN - Personal access token with repo and read:project scopes</li>
            <li>GITHUB_OWNER - Repository owner/organization name</li>
            <li>GITHUB_REPO - Repository name</li>
            <li>PROJECT_NUMBER - Project number from GitHub URL</li>
          </ul>
        </div>
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    </main>
  )
} 