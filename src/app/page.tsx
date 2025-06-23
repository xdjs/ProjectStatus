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

    try {
      const response = await fetch('/api/github-project', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setProjectData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjectData()
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchProjectData, 30000) // Poll every 30 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading && !projectData) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading project data...</p>
        </div>
      </main>
    )
  }

  if (error && !projectData) {
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
            onClick={fetchProjectData}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </main>
    )
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