'use client'

import { useState } from 'react'
import { GitHubConfig } from '@/types/github'

interface ConfigFormProps {
  onSubmit: (config: GitHubConfig) => void
}

export function ConfigForm({ onSubmit }: ConfigFormProps) {
  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('')
  const [projectNumber, setProjectNumber] = useState('')
  const [token, setToken] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!owner || !repo || !projectNumber || !token) {
      alert('Please fill in all fields')
      return
    }

    const config: GitHubConfig = {
      owner: owner.trim(),
      repo: repo.trim(),
      projectNumber: parseInt(projectNumber),
      token: token.trim(),
    }

    onSubmit(config)
  }

  return (
    <div className="bg-card p-6 rounded-lg border shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Configure GitHub Project</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="owner" className="block text-sm font-medium mb-1">
            Owner/Organization
          </label>
          <input
            type="text"
            id="owner"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="e.g., microsoft"
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        
        <div>
          <label htmlFor="repo" className="block text-sm font-medium mb-1">
            Repository Name
          </label>
          <input
            type="text"
            id="repo"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="e.g., vscode"
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        
        <div>
          <label htmlFor="projectNumber" className="block text-sm font-medium mb-1">
            Project Number
          </label>
          <input
            type="number"
            id="projectNumber"
            value={projectNumber}
            onChange={(e) => setProjectNumber(e.target.value)}
            placeholder="e.g., 1"
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Find this in your GitHub project URL: /projects/{projectNumber}
          </p>
        </div>
        
        <div>
          <label htmlFor="token" className="block text-sm font-medium mb-1">
            GitHub Personal Access Token
          </label>
          <input
            type="password"
            id="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_..."
            className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Token needs 'repo' and 'read:project' scopes
          </p>
        </div>
        
        <button
          type="submit"
          className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Connect to Project
        </button>
      </form>
    </div>
  )
} 