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
        <div className="grid gap-2 sm:gap-4 lg:gap-6 auto-cols-fr" style={{ gridTemplateColumns: `repeat(${Math.min(Object.keys(groupedItems).length, 4)}, 1fr)` }}>
          {Object.entries(groupedItems).map(([status, items]) => (
            <div key={status} className="space-y-2 lg:space-y-3">
              <div className="flex items-center justify-between sticky top-0 bg-card z-10 pb-2">
                <h4 className="font-medium text-xs lg:text-sm xl:text-base uppercase tracking-wide text-muted-foreground">
                  {status}
                </h4>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                  {items.length}
                </span>
              </div>
              
              <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
                {/* Multi-column layout within each status */}
                <div className={`columns-1 ${items.length > 8 ? 'lg:columns-2' : ''} ${items.length > 16 ? 'xl:columns-3' : ''} gap-2 lg:gap-3 space-y-2 lg:space-y-3`}>
                  {items.map((item) => (
                    <div key={item.id} className="break-inside-avoid mb-2 lg:mb-3">
                      <ProjectItemCard item={item} />
                    </div>
                  ))}
                  
                  {items.length === 0 && (
                    <div className="text-center py-4 lg:py-8 text-muted-foreground text-xs lg:text-sm">
                      No items in this column
                    </div>
                  )}
                </div>
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