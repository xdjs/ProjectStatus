'use client'

import { ProjectData, ProjectItem } from '@/types/github'
import { ProjectItemCard } from './ProjectItemCard'

interface ProjectBoardProps {
  project: ProjectData
}

export function ProjectBoard({ project }: ProjectBoardProps) {
  // Group items by status or a custom field
  const groupedItems = groupItemsByStatus(project.items)

  return (
    <div className="bg-card rounded-lg border shadow-sm">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold">Project Board</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Organized view of all project items
        </p>
      </div>
      
      <div className="p-2 sm:p-4 lg:p-6">
        <div className="grid gap-2 sm:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 4xl:grid-cols-8 5xl:grid-cols-10">
          {Object.entries(groupedItems).map(([status, items]) => (
            <div key={status} className="space-y-2 lg:space-y-3">
              <div className="flex items-center justify-between sticky top-0 bg-card z-10 pb-2">
                <h4 className="font-medium text-xs lg:text-sm uppercase tracking-wide text-muted-foreground">
                  {status}
                </h4>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                  {items.length}
                </span>
              </div>
              
              <div className="space-y-2 lg:space-y-3 min-h-[200px] max-h-[calc(100vh-12rem)] overflow-y-auto">
                {items.map((item) => (
                  <ProjectItemCard key={item.id} item={item} />
                ))}
                
                {items.length === 0 && (
                  <div className="text-center py-4 lg:py-8 text-muted-foreground text-xs lg:text-sm">
                    No items in this column
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function groupItemsByStatus(items: ProjectItem[]): Record<string, ProjectItem[]> {
  const groups: Record<string, ProjectItem[]> = {
    'Open': [],
    'In Progress': [],
    'Done': [],
    'Closed': []
  }

  items.forEach(item => {
    // Try to find a status field first
    const statusField = item.projectFields.find(field => 
      field.name.toLowerCase().includes('status') || 
      field.name.toLowerCase().includes('state')
    )

    if (statusField && statusField.value) {
      const status = statusField.value
      if (!groups[status]) {
        groups[status] = []
      }
      groups[status].push(item)
    } else {
      // Fallback to item state
      switch (item.state) {
        case 'OPEN':
          // Check if it's assigned or has labels that indicate progress
          if (item.assignees.length > 0 || item.labels.some(label => 
            label.name.toLowerCase().includes('progress') ||
            label.name.toLowerCase().includes('working') ||
            label.name.toLowerCase().includes('develop')
          )) {
            groups['In Progress'].push(item)
          } else {
            groups['Open'].push(item)
          }
          break
        case 'CLOSED':
          groups['Closed'].push(item)
          break
        case 'MERGED':
          groups['Done'].push(item)
          break
        default:
          groups['Open'].push(item)
      }
    }
  })

  // Remove empty groups
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key]
    }
  })

  return groups
} 