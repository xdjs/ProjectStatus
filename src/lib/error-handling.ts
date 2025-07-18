/**
 * Enhanced Error Handling Utilities
 * 
 * This module provides comprehensive error handling utilities for the multi-project dashboard,
 * including structured logging, user-friendly error messages, and retry mechanisms.
 */

import { NextResponse } from 'next/server'
import React from 'react'

// Error context for structured logging
export interface ErrorContext {
  operation: string
  projectName?: string
  userId?: string
  timestamp: string
  requestId?: string
  metadata?: Record<string, any>
}

// User-friendly error messages
export const ERROR_MESSAGES = {
  RATE_LIMIT: 'GitHub API rate limit exceeded. The dashboard will resume updating automatically.',
  AUTH_ERROR: 'Authentication failed. Please check your GitHub token configuration.',
  NOT_FOUND: 'Project not found. Please verify the project number and access permissions.',
  NETWORK_ERROR: 'Network connection failed. Retrying automatically...',
  TIMEOUT: 'Request timed out. This might be due to a slow network connection.',
  INVALID_CONFIG: 'Invalid project configuration. Please check your environment variables.',
  WEBHOOK_ERROR: 'Webhook processing failed. The system will retry automatically.',
  GENERIC_ERROR: 'An unexpected error occurred. Please try again later.',
  PROJECT_ACCESS_DENIED: 'Access denied to project. Please check permissions.',
  TOKEN_EXPIRED: 'GitHub token has expired. Please update your token.',
  PARSE_ERROR: 'Failed to parse response data. The project format may have changed.'
} as const

// Enhanced error classification
export class EnhancedError extends Error {
  constructor(
    message: string,
    public code: keyof typeof ERROR_MESSAGES,
    public status: number = 500,
    public retryable: boolean = true,
    public context?: ErrorContext
  ) {
    super(message)
    this.name = 'EnhancedError'
  }

  getUserMessage(): string {
    return ERROR_MESSAGES[this.code] || ERROR_MESSAGES.GENERIC_ERROR
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      retryable: this.retryable,
      context: this.context,
      stack: this.stack
    }
  }
}

// Structured error logging
export function logError(error: any, context: ErrorContext): void {
  const errorLog = {
    ...context,
    error: {
      message: error.message,
      stack: error.stack,
      status: error.status,
      name: error.name,
      code: error.code,
      retryable: error.retryable
    }
  }
  
  // Always log to console for development
  console.error('Structured error:', JSON.stringify(errorLog, null, 2))
  
  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to monitoring service (DataDog, Sentry, etc.)
    // monitoringService.logError(errorLog)
  }
}

// Network timeout wrapper
export async function fetchWithTimeout(
  url: string, 
  options: RequestInit, 
  timeout = 30000
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new EnhancedError(
        'Request timeout',
        'TIMEOUT',
        408,
        true,
        { operation: 'fetch', timestamp: new Date().toISOString() }
      )
    }
    throw error
  }
}

// Retry mechanism with exponential backoff
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  context?: ErrorContext
): Promise<T> {
  // In test environment, don't retry
  if (process.env.NODE_ENV === 'test') {
    return await operation()
  }
  
  let lastError: any
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error
      
      if (attempt === maxRetries) {
        break
      }
      
      // Check if error is retryable
      if (error instanceof EnhancedError && !error.retryable) {
        throw error
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
      
      if (context) {
        logError(error, {
          ...context,
          operation: `${context.operation}_retry_${attempt + 1}`,
          timestamp: new Date().toISOString()
        })
      }
    }
  }
  
  throw lastError
}

// Rate limit handling
export async function handleRateLimit(
  error: any,
  retryAfter?: number
): Promise<void> {
  // In test environment, don't wait
  if (process.env.NODE_ENV === 'test') {
    console.warn('Rate limit exceeded (test mode - not waiting)')
    return
  }
  
  const resetTime = error.headers?.['x-ratelimit-reset']
  const waitTime = retryAfter || 
    (resetTime ? (resetTime * 1000) - Date.now() : 60000)
  
  // Cap maximum wait time to 5 minutes
  const maxWaitTime = 5 * 60 * 1000
  const actualWaitTime = Math.min(waitTime, maxWaitTime)
  
  console.warn(`Rate limit exceeded. Waiting ${actualWaitTime / 1000} seconds...`)
  
  await new Promise(resolve => setTimeout(resolve, actualWaitTime))
}

// API error response builder
export function createErrorResponse(
  error: any,
  context?: ErrorContext
): NextResponse {
  let enhancedError: EnhancedError
  
  if (error instanceof EnhancedError) {
    enhancedError = error
  } else {
    // Convert generic errors to EnhancedError
    enhancedError = new EnhancedError(
      error.message || 'Unknown error',
      'GENERIC_ERROR',
      error.status || 500,
      true,
      context
    )
  }
  
  // Log the error
  if (context) {
    logError(enhancedError, context)
  }
  
  // Return user-friendly response
  return NextResponse.json(
    {
      error: enhancedError.getUserMessage(),
      code: enhancedError.code,
      retryable: enhancedError.retryable,
      timestamp: new Date().toISOString()
    },
    { 
      status: enhancedError.status,
      headers: {
        'Content-Type': 'application/json',
        'X-Error-Code': enhancedError.code
      }
    }
  )
}

// GitHub API error classifier
export function classifyGitHubError(error: any): EnhancedError {
  const message = error.message || 'Unknown GitHub API error'
  const status = error.status || 500
  
  // Rate limit errors
  if (status === 403 && message.includes('rate limit')) {
    return new EnhancedError(
      'Rate limit exceeded',
      'RATE_LIMIT',
      403,
      true
    )
  }
  
  // Authentication errors
  if (status === 401 || message.includes('authentication') || message.includes('token')) {
    return new EnhancedError(
      'Authentication failed',
      'AUTH_ERROR',
      401,
      false
    )
  }
  
  // Not found errors
  if (status === 404 || message.includes('not found')) {
    return new EnhancedError(
      'Project not found',
      'NOT_FOUND',
      404,
      true  // Make retryable so it can try user scope after org scope fails
    )
  }
  
  // Access denied errors
  if (status === 403 && !message.includes('rate limit')) {
    return new EnhancedError(
      'Access denied',
      'PROJECT_ACCESS_DENIED',
      403,
      false
    )
  }
  
  // Network errors
  if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
    return new EnhancedError(
      'Network error',
      'NETWORK_ERROR',
      503,
      true
    )
  }
  
  // Generic error
  return new EnhancedError(
    message,
    'GENERIC_ERROR',
    status,
    status >= 500
  )
}

// Webhook error handler
export function handleWebhookError(
  error: any,
  webhookData: any
): NextResponse {
  const context: ErrorContext = {
    operation: 'webhook_processing',
    timestamp: new Date().toISOString(),
    metadata: {
      webhookType: webhookData?.action || 'unknown',
      repository: webhookData?.repository?.full_name || 'unknown',
      sender: webhookData?.sender?.login || 'unknown'
    }
  }
  
  const enhancedError = new EnhancedError(
    error.message || 'Webhook processing failed',
    'WEBHOOK_ERROR',
    500,
    true,
    context
  )
  
  // Store failed webhook for retry (in production)
  if (process.env.NODE_ENV === 'production') {
    // TODO: Store failed webhook in database or queue for retry
    // await storeFailedWebhook(webhookData, enhancedError)
  }
  
  return createErrorResponse(enhancedError, context)
}

// Component error boundary helper
export function createErrorBoundary(
  fallbackComponent: React.ComponentType<{ error: Error }>
) {
  return class ErrorBoundary extends React.Component<
    React.PropsWithChildren<{}>,
    { hasError: boolean; error: Error | null }
  > {
    constructor(props: React.PropsWithChildren<{}>) {
      super(props)
      this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      const context: ErrorContext = {
        operation: 'component_error',
        timestamp: new Date().toISOString(),
        metadata: {
          componentStack: errorInfo.componentStack,
          errorBoundary: this.constructor.name
        }
      }
      
      logError(error, context)
    }

    render() {
      if (this.state.hasError && this.state.error) {
        const FallbackComponent = fallbackComponent
        return React.createElement(FallbackComponent, { error: this.state.error })
      }
      
      return this.props.children
    }
  }
}