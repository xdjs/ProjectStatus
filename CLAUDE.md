# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **GitHub Project Dashboard** - a Next.js 14 application that displays real-time GitHub project information in a Kanban-style board format. It's designed for public displays, office TVs, and team dashboards without requiring visitor authentication.

## Development Commands

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build the production application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint to check code quality

## Environment Configuration

Required environment variables in `.env.local`:
- `GITHUB_TOKEN` - Personal access token with `repo` and `read:project` scopes
- `GITHUB_OWNER` - Repository owner or organization name
- `GITHUB_REPO` - Repository name (optional, for display)
- `PROJECT_NUMBER` - GitHub project number from URL
- `NEXT_PUBLIC_POLLING_INTERVAL` - Polling interval in milliseconds (default: 60000 = 1 minute)

## Architecture Overview

This is a Next.js 14 application that displays GitHub project data in a Kanban-style dashboard. The architecture follows these key patterns:

### API Layer
- `src/app/api/github-project/route.ts` - Main API endpoint that fetches project data using GitHub GraphQL API
- `src/app/api/events/route.ts` - Server-Sent Events endpoint for real-time updates
- `src/app/api/webhook/route.ts` - GitHub webhook handler for project updates

### Data Flow
1. Client polls `/api/github-project` every 30 seconds for updates
2. Server-side authentication using GitHub personal access token
3. GraphQL queries fetch project data from both organization and user scopes
4. Data is transformed and cached with aggressive no-cache headers

### Component Structure
- `src/components/ProjectDashboard.tsx` - Main wrapper component with project statistics
- `src/components/ProjectBoard.tsx` - Kanban board with predefined column order
- `src/components/ProjectItemCard.tsx` - Individual project item display

### Key Features
- Real-time synchronization with GitHub projects
- Screen wake lock for TV display usage
- Responsive design with mobile support
- Column organization follows predefined order: Artist Web Map TODO, MN Research TODO, Music Nerd NG TODO, Bonus, On Deck, In Progress, Done

### Data Types
- `ProjectData` - Main project structure with items and metadata
- `ProjectItem` - Individual project items (issues, PRs, draft issues)
- All types defined in `src/types/github.ts`

### Styling
- Tailwind CSS with custom utility classes
- Responsive grid layout that adapts to screen size
- Dark/light theme support through CSS variables

## Development Notes

- The application is designed for public display without authentication
- Project items are automatically organized by their Status field
- Column names can be customized in `ProjectBoard.tsx` COLUMN_ORDER array
- Real-time updates use both Server-Sent Events and polling fallback
- GitHub API rate limits allow ~120 requests/hour with 30-second polling

## Important Patterns

### Error Handling
- All API calls include proper error handling with user-friendly messages
- Fallback mechanisms for when GitHub API is unavailable
- Graceful degradation when real-time updates fail

### Performance
- Aggressive caching prevention to ensure fresh data
- Efficient re-rendering with React state management
- Optimized for continuous display usage

### Security
- Server-side authentication keeps tokens secure
- No client-side secrets or tokens
- Public read-only access to dashboard

## Deployment

The application is designed for easy deployment on platforms like Vercel:
1. Set environment variables in deployment platform
2. Deploy from main branch
3. No additional configuration needed

## Customization

### Update Frequency
Modify polling interval by setting the `NEXT_PUBLIC_POLLING_INTERVAL` environment variable in `.env.local`:
```env
NEXT_PUBLIC_POLLING_INTERVAL=30000  # 30 seconds (in milliseconds)
```

You can also modify it directly in `src/app/page.tsx` if needed:
```typescript
const pollingInterval = parseInt(process.env.NEXT_PUBLIC_POLLING_INTERVAL || '60000', 10)
const interval = setInterval(fetchProjectData, pollingInterval)
```

### Column Layout
Customize column organization in `src/components/ProjectBoard.tsx`:
```typescript
const COLUMN_ORDER = ['Artist Web Map TODO', 'MN Research TODO', ...]
```

### Styling
- Global styles in `src/app/globals.css`
- Component-specific styles use Tailwind classes
- Theme customization through CSS variables