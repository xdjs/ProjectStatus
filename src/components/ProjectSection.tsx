'use client'

import React from 'react'
import { ProjectData, ProjectItem } from '@/types/github'
import { ProjectItemCard } from './ProjectItemCard'

interface ProjectSectionProps {
  project: ProjectData
}

export function ProjectSection({ project }: ProjectSectionProps) {
  console.log('ProjectSection render:', {
    projectName: project.projectName,
    totalItems: project.items.length,
    title: project.title
  })

  // Filter items to only show TODO items based on project configuration
  const todoColumns = project.projectConfig?.todoColumns && project.projectConfig.todoColumns.length > 0 
    ? project.projectConfig.todoColumns 
    : ['TODO']
  const todoItems = filterTodoItems(project.items, todoColumns)
  
  console.log('ProjectSection TODO items:', {
    projectName: project.projectName,
    todoColumns: project.projectConfig?.todoColumns,
    todoItemCount: todoItems.length
  })

  return (
    <div className="bg-card rounded-lg border shadow-sm flex flex-col h-full">
      {/* Project header */}
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold truncate">{project.projectName || project.title}</h2>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {project.description || `${project.owner?.login}/${project.repository?.name}`}
            </p>
          </div>
          <div className="flex items-center space-x-4 text-sm flex-shrink-0">
            <div className="text-center">
              <div className="font-semibold text-primary">{todoItems.length}</div>
              <div className="text-muted-foreground">TODO Items</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">{project.items.length}</div>
              <div className="text-muted-foreground">Total Items</div>
            </div>
          </div>
        </div>
      </div>

      {/* TODO columns section */}
      <div className="flex-1 overflow-hidden">
        <TODOColumnsDisplay todoItems={todoItems} todoColumns={todoColumns} />
      </div>
    </div>
  )
}

function TODOColumnsDisplay({ todoItems, todoColumns }: { todoItems: ProjectItem[]; todoColumns: string[] }) {
  const groupedItems = groupItemsByTodoColumns(todoItems, todoColumns)
  
  // Only show columns that have items or are explicitly configured
  const visibleColumns = todoColumns.filter(column => 
    groupedItems[column] && groupedItems[column].length > 0
  )
  
  if (visibleColumns.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No TODO items in configured columns</p>
        <p className="text-xs text-muted-foreground/70 mt-2">
          Configured columns: {todoColumns.join(', ')}
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 h-full">
      <div className="grid gap-4 h-full" style={{ gridTemplateColumns: `repeat(${visibleColumns.length}, 1fr)` }}>
        {visibleColumns.map((column) => (
          <TODOColumn 
            key={column} 
            columnName={column} 
            items={groupedItems[column] || []} 
          />
        ))}
      </div>
    </div>
  )
}

function TODOColumn({ columnName, items }: { columnName: string; items: ProjectItem[] }) {
  return (
    <div className="flex flex-col h-full">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          {columnName}
        </h3>
        <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
          {items.length}
        </span>
      </div>

      {/* Column items */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2">
          {items.map((item) => (
            <ProjectItemCard key={item.id} item={item} />
          ))}
          
          {items.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No items in this column
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function filterTodoItems(items: ProjectItem[], todoColumns: string[]): ProjectItem[] {
  return items.filter(item => {
    // Find the status field (could be named differently per project)
    const statusField = item.projectFields.find(field => 
      ['Status', 'Column', 'State', 'Phase', 'Stage'].includes(field.name)
    )
    
    const status = statusField?.value
    return status && todoColumns.includes(status)
  })
}

function groupItemsByTodoColumns(items: ProjectItem[], todoColumns: string[]): Record<string, ProjectItem[]> {
  const groups: Record<string, ProjectItem[]> = {}
  
  // Initialize all configured columns
  todoColumns.forEach(column => {
    groups[column] = []
  })
  
  // Group items by their status
  items.forEach(item => {
    const statusField = item.projectFields.find(field => 
      ['Status', 'Column', 'State', 'Phase', 'Stage'].includes(field.name)
    )
    
    const status = statusField?.value
    if (status && groups[status]) {
      groups[status].push(item)
    }
  })
  
  return groups
}