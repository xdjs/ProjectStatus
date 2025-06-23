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
        <div className="grid gap-2 sm:gap-4 lg:gap-6 auto-cols-fr" style={{ gridTemplateColumns: `repeat(${Math.min(Object.keys(groupedItems).length, 5)}, 1fr)` }}>
          {getSortedStatusEntries(groupedItems).map(([status, items]) => (
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
  // Initialize with your actual project status columns
  const groups: Record<string, ProjectItem[]> = {
    'TODO': [],
    'On Deck': [],
    'BONUS': [],
    'In Progress': [],
    'Done': []
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
      // Fallback: put items without status in TODO
      groups['TODO'].push(item)
    }
  })

  // Keep empty groups to show all columns
  return groups
}

function getSortedStatusEntries(groupedItems: Record<string, ProjectItem[]>): [string, ProjectItem[]][] {
  // Define the desired order
  const statusOrder = ['TODO', 'On Deck', 'BONUS', 'In Progress', 'Done']
  
  // Create a mapping of normalized status names to actual status names
  const statusMapping: Record<string, string> = {}
  Object.keys(groupedItems).forEach(status => {
    const normalizedStatus = status.toUpperCase().replace(/\s+/g, ' ').trim()
    statusMapping[normalizedStatus] = status
  })
  
  // Sort entries based on the desired order
  const sortedEntries: [string, ProjectItem[]][] = []
  
  // First, add items in the specified order
  statusOrder.forEach(orderedStatus => {
    if (statusMapping[orderedStatus.toUpperCase().replace(/\s+/g, ' ').trim()]) {
      const actualStatus = statusMapping[orderedStatus.toUpperCase().replace(/\s+/g, ' ').trim()]
      sortedEntries.push([actualStatus, groupedItems[actualStatus]])
    }
  })
  
  // Then add any remaining statuses not in the specified order
  Object.entries(groupedItems).forEach(([status, items]) => {
    const normalizedStatus = status.toUpperCase().replace(/\s+/g, ' ').trim()
    if (!statusOrder.some(orderedStatus => orderedStatus.toUpperCase().replace(/\s+/g, ' ').trim() === normalizedStatus)) {
      sortedEntries.push([status, items])
    }
  })
  
  return sortedEntries
} 