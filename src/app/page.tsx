'use client'

import { useState, useEffect } from 'react'
import { ProjectDashboard } from '@/components/ProjectDashboard'
import { ProjectData } from '@/types/github'

export default function Home() {
  const [projectData, setProjectData] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjectData = async () => {
    setLoading(true)
    setError(null)
    console.log('Fetching project data...', new Date().toISOString())

    try {
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/github-project?t=${timestamp}`, {
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

      const data = await response.json()
      console.log('Project data updated at:', data.lastFetched || new Date().toISOString())
      console.log('Total items:', data.items?.length || 0)
      
      // Log status distribution for debugging
      const statusCounts = data.items?.reduce((acc: any, item: any) => {
        const status = item.projectFields?.find((field: any) => field.name === 'Status')?.value || 'No Status'
        acc[status] = (acc[status] || 0) + 1
        return acc
      }, {}) || {}
      console.log('Status distribution:', statusCounts)
      
      setProjectData(data)
    } catch (err) {
      console.error('Error fetching project data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch project data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjectData()
    
    // Set up Server-Sent Events for real-time updates
    const eventSource = new EventSource('/api/events')
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log('Real-time event received:', data)
      
      if (data.type === 'project_item_updated') {
        console.log('Project item updated, refreshing data...')
        fetchProjectData()
      }
    }
    
    eventSource.onerror = (error) => {
      console.error('EventSource error:', error)
      console.log('Falling back to polling...')
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

  if (loading && !projectData) {
    return <LoadingState />
  }

  if (error && !projectData) {
    return <ErrorState error={error} onRetry={fetchProjectData} />
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <ProjectDashboard 
        projectData={projectData} 
        loading={loading}
        error={error}
        onReconfigure={fetchProjectData}
      />
    </main>
  )
}

function LoadingState() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading project data...</p>
      </div>
    </main>
  )
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <main className="container mx-auto px-4 py-8">
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