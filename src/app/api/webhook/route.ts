import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import crypto from 'crypto'
import { broadcastUpdate } from '@/lib/events'

// Webhook secret for validating GitHub webhook requests
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = headers()
    
    // Verify webhook signature if secret is configured
    const signature = headersList.get('x-hub-signature-256')
    const event = headersList.get('x-github-event')
    
    if (WEBHOOK_SECRET && signature) {
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(body)
        .digest('hex')}`
      
      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }
    
    const payload = JSON.parse(body)
    console.log(`Received ${event} webhook:`, {
      action: payload.action,
      sender: payload.sender?.login,
      issue_title: payload.issue?.title,
      issue_number: payload.issue?.number,
      pr_title: payload.pull_request?.title,
      pr_number: payload.pull_request?.number
    })
    
    // Always broadcast update - any webhook activity suggests something changed
    console.log('Broadcasting project update due to webhook activity')
    broadcastUpdate({
      type: 'project_item_updated',
      event: event,
      action: payload.action,
      timestamp: new Date().toISOString()
    })
    
    // Legacy specific handlers (keeping for detailed logging)
    if (event === 'projects_v2_item') {
      const { action, changes, projects_v2_item } = payload
      
      if (action === 'edited' && changes?.field_value?.field_name === 'Status') {
        console.log(`Item ${projects_v2_item.id} moved from "${changes.field_value.from?.name}" to "${changes.field_value.to?.name}"`)
      }
    }
    
    if (event === 'issues' || event === 'pull_request') {
      console.log(`${event} ${payload.action}: ${payload[event.slice(0, -1)]?.title || 'Unknown'}`)
    }
    
    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Handle GET requests (for webhook verification)
export async function GET() {
  return NextResponse.json({ status: 'Webhook endpoint active' })
} 