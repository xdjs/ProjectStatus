# Multi-Project Dashboard Implementation Plan

## Overview
Transform the current single-project GitHub dashboard into a multi-project dashboard that displays TODO items from multiple GitHub projects in a horizontal layout. Each project will have its own section, and all projects will be visible when the browser window is maximized.

## Current State Analysis
- **Single Project Support**: Currently displays one GitHub project at a time
- **Configuration**: Uses single project environment variables (GITHUB_OWNER, GITHUB_REPO, PROJECT_NUMBER)
- **API**: Single endpoint `/api/github-project` fetches one project
- **UI**: Full-width display for single project Kanban board
- **Filtering**: Shows all columns (TODO, Bonus, On Deck, In Progress, Done)

## Target State
- **Multi-Project Support**: Display multiple GitHub projects simultaneously
- **Horizontal Layout**: Projects arranged side-by-side when window is maximized
- **TODO Focus**: Each project section shows only TODO items (simplify display)
- **Responsive**: Graceful fallback for smaller screens
- **Individual Project Headers**: Clear project identification and metadata

## Implementation Tasks

### Phase 1: Configuration and Data Types

#### Task 1.1: Update Environment Configuration
- [ ] **File**: `.env.local` (example)
- [ ] **Action**: Design multi-project configuration format
- [ ] **Details**: 
  - Support both single project (backward compatibility) and multi-project modes
  - JSON-based configuration for multiple projects
  - Example format:
    ```env
    # Multi-project mode
    PROJECTS_CONFIG=[
      {"name": "Project A", "owner": "org1", "repo": "repo1", "projectNumber": 1, "todoColumns": ["TODO", "In Progress"]},
      {"name": "Project B", "owner": "org2", "repo": "repo2", "projectNumber": 2, "todoColumns": ["Backlog", "Active"]}
    ]
    
    # Legacy single project (fallback)
    GITHUB_OWNER=org1
    GITHUB_REPO=repo1
    PROJECT_NUMBER=1
    ```
- [ ] **Tests Required**: Unit tests for configuration parsing and validation
- [ ] **Acceptance Criteria**: 
  - Configuration parser handles both single and multi-project modes
  - Invalid JSON configurations fail gracefully with helpful error messages
  - All tests pass
  - Manual verification with sample configurations

#### Task 1.2: Extend TypeScript Types
- [ ] **File**: `src/types/github.ts`
- [ ] **Action**: Add multi-project data structures
- [ ] **Details**:
  - `ProjectConfig` interface for individual project configuration
  - `MultiProjectData` interface for API response
  - `ProjectData` extension to include project metadata (name, config)
  - Error handling types for individual project failures
- [ ] **Tests Required**: TypeScript compilation tests and type validation tests
- [ ] **Acceptance Criteria**:
  - All type definitions compile without errors
  - Type tests validate expected interface contracts
  - Manual verification that types work correctly in IDE
  - All tests pass

#### Task 1.3: Create Configuration Parser
- [ ] **File**: `src/lib/config.ts` (new)
- [ ] **Action**: Build configuration parsing utilities
- [ ] **Details**:
  - Parse JSON configuration with validation
  - Fallback to legacy single-project mode
  - Export typed configuration objects
  - Handle malformed configuration gracefully
- [ ] **Tests Required**: 
  - Unit tests for valid configurations
  - Unit tests for invalid configurations
  - Unit tests for legacy fallback mode
  - Integration tests with environment variables
- [ ] **Acceptance Criteria**:
  - Parser correctly handles all valid configuration formats
  - Invalid configurations produce helpful error messages
  - Legacy mode works identically to current implementation
  - All tests pass (minimum 90% code coverage)
  - Manual testing with various configuration scenarios

### Phase 2: API Layer Updates

#### Task 2.1: Create Multi-Project API Endpoint
- [ ] **File**: `src/app/api/projects/route.ts` (new)
- [ ] **Action**: Build new API endpoint for multiple projects
- [ ] **Details**:
  - Fetch multiple projects concurrently
  - Handle individual project failures gracefully
  - Aggregate results with error reporting
  - Maintain same caching strategy as single project
- [ ] **Tests Required**:
  - Unit tests for API endpoint logic
  - Integration tests with mock GitHub API
  - Error handling tests for individual project failures
  - Performance tests for concurrent requests
- [ ] **Acceptance Criteria**:
  - API returns data for all configured projects
  - Individual project failures don't break entire response
  - Response time acceptable for multiple projects
  - All tests pass
  - Manual API testing with curl/Postman

#### Task 2.2: Extend GitHub API Client
- [ ] **File**: `src/lib/github-client.ts` (new or extract from existing)
- [ ] **Action**: Create reusable GitHub API client
- [ ] **Details**:
  - Extract GraphQL queries from route handler
  - Support both organization and user project queries
  - Handle rate limiting and authentication
  - Concurrent project fetching with Promise.allSettled
- [ ] **Tests Required**:
  - Unit tests for GraphQL query generation
  - Unit tests for rate limiting handling
  - Integration tests with GitHub API (using test tokens)
  - Mock tests for error scenarios
- [ ] **Acceptance Criteria**:
  - Client successfully fetches projects from both org and user scopes
  - Rate limiting handled gracefully
  - Authentication errors handled properly
  - All tests pass
  - Manual testing with real GitHub API

#### Task 2.3: Update Data Transformation
- [ ] **File**: `src/lib/data-transform.ts` (new)
- [ ] **Action**: Transform GitHub API responses for multi-project use
- [ ] **Details**:
  - Filter items by TODO columns per project
  - Normalize project data structure
  - Handle different project schemas
  - Add project metadata (name, config, last updated)
- [ ] **Tests Required**:
  - Unit tests for data transformation logic
  - Unit tests for TODO column filtering
  - Unit tests for different project schemas
  - Integration tests with real GitHub API responses
- [ ] **Acceptance Criteria**:
  - Data transformation produces consistent output format
  - TODO filtering works correctly for each project
  - Edge cases handled (empty projects, missing fields)
  - All tests pass
  - Manual verification with sample GitHub data

### Phase 3: Component Architecture

#### Task 3.1: Create Multi-Project Dashboard Component
- [ ] **File**: `src/components/MultiProjectDashboard.tsx` (new)
- [ ] **Action**: Build main multi-project container
- [ ] **Details**:
  - Horizontal layout with CSS Grid
  - Responsive design (horizontal when wide, vertical when narrow)
  - Project section headers with metadata
  - Error handling for individual project failures
  - Loading states per project
- [ ] **Tests Required**:
  - Unit tests for component rendering
  - Unit tests for responsive layout behavior
  - Unit tests for error state handling
  - Visual regression tests for layout
  - Integration tests with mock data
- [ ] **Acceptance Criteria**:
  - Component renders correctly with multiple projects
  - Responsive behavior works on different screen sizes
  - Error states display appropriately
  - Loading states work correctly
  - All tests pass
  - Manual testing across different browsers and devices

#### Task 3.2: Update Project Board for TODO-Only Mode
- [ ] **File**: `src/components/ProjectBoard.tsx`
- [ ] **Action**: Add TODO-only filtering mode
- [ ] **Details**:
  - Add `todoOnly` prop to filter displayed columns
  - Maintain existing full-board mode for backward compatibility
  - Update column mapping to handle project-specific TODO columns
  - Optimize layout for smaller horizontal space
- [ ] **Tests Required**:
  - Unit tests for TODO-only filtering logic
  - Unit tests for backward compatibility
  - Unit tests for column mapping
  - Visual regression tests for both modes
  - Integration tests with different project configurations
- [ ] **Acceptance Criteria**:
  - TODO-only mode displays only specified columns
  - Full-board mode works identically to current implementation
  - Column mapping handles various project configurations
  - All tests pass
  - Manual testing with different project setups

#### Task 3.3: Create Project Section Component
- [ ] **File**: `src/components/ProjectSection.tsx` (new)
- [ ] **Action**: Individual project section wrapper
- [ ] **Details**:
  - Project header with name, stats, and links
  - Embedded ProjectBoard in TODO-only mode
  - Error states for individual project failures
  - Responsive height management
- [ ] **Tests Required**:
  - Unit tests for component rendering
  - Unit tests for error state handling
  - Unit tests for project metadata display
  - Visual regression tests
  - Integration tests with ProjectBoard
- [ ] **Acceptance Criteria**:
  - Project header displays correct information
  - Error states handled gracefully
  - Height management works responsively
  - All tests pass
  - Manual testing with various project states

### Phase 4: UI/UX Updates

#### Task 4.1: Update Main Page Layout
- [ ] **File**: `src/app/page.tsx`
- [ ] **Action**: Switch to multi-project API and components
- [ ] **Details**:
  - Detect single vs multi-project mode
  - Use appropriate API endpoint
  - Render MultiProjectDashboard or legacy ProjectDashboard
  - Handle loading and error states

#### Task 4.2: Responsive Layout Implementation
- [ ] **File**: `src/components/MultiProjectDashboard.tsx`
- [ ] **Action**: Implement responsive horizontal layout
- [ ] **Details**:
  - CSS Grid with `grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))`
  - Horizontal scrolling fallback for many projects
  - Breakpoint-based layout switching
  - Maintain readability on all screen sizes

#### Task 4.3: Update Global Styles
- [ ] **File**: `src/app/globals.css`
- [ ] **Action**: Add multi-project layout styles
- [ ] **Details**:
  - CSS variables for multi-project spacing
  - Responsive typography scaling
  - Ensure consistent spacing across projects
  - Maintain accessibility standards

### Phase 5: Testing and Optimization

#### Task 5.1: Configuration Validation
- [ ] **File**: `src/lib/config.ts`
- [ ] **Action**: Add comprehensive config validation
- [ ] **Details**:
  - JSON schema validation for projects config
  - Required field validation
  - GitHub API token scope validation
  - Helpful error messages for misconfigurations

#### Task 5.2: Error Handling Enhancement
- [ ] **File**: Multiple files
- [ ] **Action**: Robust error handling across the application
- [ ] **Details**:
  - Individual project failure handling
  - Network error recovery
  - GitHub API rate limit handling
  - User-friendly error messages

#### Task 5.3: Performance Optimization
- [ ] **File**: `src/app/api/projects/route.ts`
- [ ] **Action**: Optimize multi-project data fetching
- [ ] **Details**:
  - Concurrent API calls with proper error isolation
  - Caching strategy for multiple projects
  - Request deduplication
  - Memory usage optimization

### Phase 6: Documentation and Deployment

#### Task 6.1: Update Documentation
- [ ] **File**: `README.md`
- [ ] **Action**: Document multi-project configuration
- [ ] **Details**:
  - Multi-project setup instructions
  - Configuration examples
  - Migration guide from single project
  - Troubleshooting guide

#### Task 6.2: Update CLAUDE.md
- [ ] **File**: `CLAUDE.md`
- [ ] **Action**: Update development documentation
- [ ] **Details**:
  - Multi-project architecture overview
  - Component structure updates
  - Configuration management
  - Development workflow changes

## Implementation Priority

### High Priority (Core Functionality)
1. Task 1.1: Environment Configuration
2. Task 1.2: TypeScript Types
3. Task 2.1: Multi-Project API Endpoint
4. Task 3.1: Multi-Project Dashboard Component

### Medium Priority (UI/UX)
1. Task 3.2: ProjectBoard TODO-Only Mode
2. Task 4.1: Main Page Layout Updates
3. Task 4.2: Responsive Layout Implementation

### Low Priority (Polish)
1. Task 5.1: Configuration Validation
2. Task 5.2: Error Handling Enhancement
3. Task 6.1: Documentation Updates

## Technical Considerations

### Backward Compatibility
- Maintain support for single-project mode
- Detect configuration format automatically
- No breaking changes to existing deployments

### Performance
- Concurrent API calls for multiple projects
- Individual project error isolation
- Efficient re-rendering strategies
- Memory usage optimization for many projects

### Scalability
- Support for 2-10 projects comfortably
- Horizontal scrolling for many projects
- Responsive design for various screen sizes
- Configurable polling intervals per project

### Security
- Secure token handling for multiple projects
- Individual project authentication
- No client-side secret exposure
- Rate limit awareness

## Testing Strategy

### Test Types Required

#### Unit Tests
- **Coverage**: Minimum 90% code coverage for all new code
- **Tools**: Jest, React Testing Library
- **Scope**: Individual functions, components, and utilities
- **Focus**: Logic, edge cases, error handling

#### Integration Tests
- **Tools**: Jest, MSW (Mock Service Worker) for API mocking
- **Scope**: Component interactions, API integrations
- **Focus**: Data flow, component communication

#### Visual Regression Tests
- **Tools**: Storybook, Chromatic (if available) or manual screenshots
- **Scope**: UI components, layout changes
- **Focus**: Visual consistency across screen sizes

#### End-to-End Tests
- **Tools**: Playwright or Cypress (if time permits)
- **Scope**: Full user workflows
- **Focus**: Multi-project display, responsive behavior

### Test Requirements by Phase

#### Phase 1: Configuration and Data Types
- Unit tests for all configuration parsing logic
- Type validation tests
- Error handling tests for invalid configurations

#### Phase 2: API Layer
- Unit tests for API endpoints
- Integration tests with mocked GitHub API
- Error handling tests for API failures
- Performance tests for concurrent requests

#### Phase 3: Component Architecture
- Unit tests for all new components
- Integration tests for component interactions
- Visual regression tests for layout changes
- Responsive behavior tests

#### Phase 4: UI/UX Updates
- End-to-end tests for full user workflows
- Cross-browser compatibility tests
- Performance tests for rendering multiple projects

### Manual Testing Requirements

#### Functional Testing
- Test with various project configurations (1-5 projects)
- Test with different screen sizes (mobile, tablet, desktop, wide)
- Test error scenarios (network failures, invalid tokens, missing projects)
- Test backward compatibility with single-project setups

#### Browser Compatibility
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

#### Performance Testing
- Load time with multiple projects
- Memory usage monitoring
- Network request optimization verification

## Task Completion Criteria

### Definition of Done
A task is considered complete ONLY when:

1. **✅ Code Implementation**: Feature implemented according to specifications
2. **✅ Tests Written**: All required tests written and passing
3. **✅ Test Coverage**: Minimum 90% code coverage achieved
4. **✅ Code Review**: Code reviewed and approved
5. **✅ Manual Testing**: Manual acceptance testing completed and documented
6. **✅ Documentation**: Code documented and CLAUDE.md updated if needed
7. **✅ Integration**: Changes integrate properly with existing codebase

### Acceptance Testing Checklist
For each task, the following must be verified manually:

- [ ] Feature works as specified
- [ ] Error scenarios handled gracefully
- [ ] Responsive behavior works correctly
- [ ] Performance meets expectations
- [ ] Backward compatibility maintained
- [ ] No visual regressions introduced
- [ ] Cross-browser compatibility verified

## Success Criteria

1. **Functional**: Successfully display TODO items from multiple GitHub projects
2. **Layout**: Horizontal layout works on maximized browser windows
3. **Responsive**: Graceful fallback for smaller screens
4. **Performance**: No significant performance degradation with multiple projects
5. **Backward Compatible**: Existing single-project setups continue to work
6. **Maintainable**: Clean, well-documented code architecture
7. **Tested**: Comprehensive test coverage with all tests passing
8. **Verified**: Manual acceptance testing completed for all features

## Estimated Timeline

- **Phase 1-2**: 2-3 days (Configuration and API)
- **Phase 3-4**: 3-4 days (Components and UI)
- **Phase 5-6**: 1-2 days (Testing and Documentation)

**Total Estimated Time**: 6-9 days

## Dependencies

- GitHub API access tokens with appropriate scopes
- Next.js 14 framework capabilities
- Tailwind CSS for responsive design
- TypeScript for type safety
- Current codebase stability