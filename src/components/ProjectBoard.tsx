'use client'

import { ProjectData, ProjectItem } from '@/types/github'
import { ProjectItemCard } from './ProjectItemCard'

interface ProjectBoardProps {
  project: ProjectData
}

// Predefined column order
const COLUMN_ORDER = ['TODO', 'Bonus', 'On Deck', 'In Progress', 'Done']

export function ProjectBoard({ project }: ProjectBoardProps) {
  console.log('ProjectBoard render - project items:', project.items.length)
  
  const groupedItems = groupItemsByStatus(project.items)
  console.log('ProjectBoard - grouped items:', Object.keys(groupedItems).map(key => ({
    column: key,
    count: groupedItems[key].length
  })))
  
  const sortedColumns = getSortedColumns(groupedItems)
  console.log('ProjectBoard - sorted columns:', sortedColumns.map(([status, items]) => ({
    status,
    count: items.length
  })))

  return (
    <div className="bg-card rounded-lg border shadow-sm">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold">Project Board</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Organized view of all project items
        </p>
      </div>
      
      <div className="p-2 sm:p-4 lg:p-6">
        <div className="grid gap-2 sm:gap-4 lg:gap-6" style={{ gridTemplateColumns: `repeat(${sortedColumns.length}, 1fr)` }}>
          {sortedColumns.map(([status, items]) => (
            <ProjectColumn key={status} status={status} items={items} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ProjectColumn({ status, items }: { status: string; items: ProjectItem[] }) {
  return (
    <div className="space-y-2 lg:space-y-3">
      <div className="flex items-center justify-between sticky top-0 bg-card z-10 pb-2">
        <h4 className="font-medium text-xs lg:text-sm xl:text-base uppercase tracking-wide text-muted-foreground">
          {status}
        </h4>
        <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
          {items.length}
        </span>
      </div>
      
      <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
        <div className={`columns-1 ${items.length > 4 ? 'lg:columns-2' : ''} ${items.length > 12 ? 'xl:columns-3' : ''} gap-2 lg:gap-3 space-y-2 lg:space-y-3`}>
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
  )
}

function groupItemsByStatus(items: ProjectItem[]): Record<string, ProjectItem[]> {
  // Initialize with predefined columns
  const groups: Record<string, ProjectItem[]> = Object.fromEntries(
    COLUMN_ORDER.map(status => [status, []])
  )

  items.forEach(item => {
    const statusField = item.projectFields.find(field => 
      field.name.toLowerCase().includes('status')
    )
    let status = statusField?.value || 'TODO'
    
    // Normalize status to match our column order
    status = normalizeStatus(status)
    
    // Create column if it doesn't exist
    if (!groups[status]) {
      groups[status] = []
    }
    groups[status].push(item)
  })

  return groups
}

function normalizeStatus(status: string): string {
  const statusLower = status.toLowerCase()
  
  // Map various forms of status to our standardized column names
  if (statusLower === 'todo' || statusLower === 'to do' || statusLower === 'to-do') {
    console.log(`Normalizing "${status}" -> "ToDo"`)
    return 'ToDo'
  }
  if (statusLower === 'bonus') {
    console.log(`Normalizing "${status}" -> "Bonus"`)
    return 'Bonus'
  }
  if (statusLower === 'on deck' || statusLower === 'ondeck' || statusLower === 'on-deck') {
    console.log(`Normalizing "${status}" -> "On Deck"`)
    return 'On Deck'
  }
  if (statusLower === 'in progress' || statusLower === 'inprogress' || statusLower === 'in-progress') {
    console.log(`Normalizing "${status}" -> "In Progress"`)
    return 'In Progress'
  }
  if (statusLower === 'done' || statusLower === 'completed' || statusLower === 'complete') {
    console.log(`Normalizing "${status}" -> "Done"`)
    return 'Done'
  }
  
  // Handle exact matches from GitHub (GitHub returns these exact values)
  if (status === 'Todo') {
    console.log(`Exact match "${status}" -> "ToDo"`)
    return 'ToDo'
  }
  if (status === 'In Progress') {
    console.log(`Exact match "${status}" -> "In Progress"`)
    return 'In Progress'
  }
  if (status === 'On Deck') {
    console.log(`Exact match "${status}" -> "On Deck"`)
    return 'On Deck'
  }
  if (status === 'Done') {
    console.log(`Exact match "${status}" -> "Done"`)
    return 'Done'
  }
  if (status === 'Bonus') {
    console.log(`Exact match "${status}" -> "Bonus"`)
    return 'Bonus'
  }
  
  // Return original status if no mapping found
  console.log(`No normalization for "${status}" - keeping as-is`)
  return status
}

function getSortedColumns(groupedItems: Record<string, ProjectItem[]>): [string, ProjectItem[]][] {
  const sorted: [string, ProjectItem[]][] = []
  
  // Add predefined columns in order
  COLUMN_ORDER.forEach(status => {
    if (groupedItems[status]) {
      sorted.push([status, groupedItems[status]])
    }
  })
  
  // Add any additional columns not in predefined order
  Object.entries(groupedItems).forEach(([status, items]) => {
    if (!COLUMN_ORDER.includes(status)) {
      sorted.push([status, items])
    }
  })
  
  return sorted
} 