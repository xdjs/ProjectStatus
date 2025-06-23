import { NextRequest, NextResponse } from 'next/server'
import { graphql } from '@octokit/graphql'

const PROJECT_QUERY = `
  query GetProject($owner: String!, $number: Int!) {
    user(login: $owner) {
      projectV2(number: $number) {
        id
        number
        title
        shortDescription
        readme
        public
        closed
        createdAt
        updatedAt
        url
        owner {
          ... on User {
            login
            avatarUrl
            url
          }
          ... on Organization {
            login
            avatarUrl
            url
          }
        }
        items(first: 100) {
          nodes {
            id
            type
            createdAt
            updatedAt
            content {
              ... on Issue {
                id
                title
                body
                url
                state
                createdAt
                updatedAt
                closedAt
                author {
                  login
                  avatarUrl
                  url
                }
                assignees(first: 10) {
                  nodes {
                    login
                    avatarUrl
                    url
                  }
                }
                labels(first: 10) {
                  nodes {
                    name
                    color
                    description
                  }
                }
                milestone {
                  title
                  description
                  dueOn
                  state
                }
                repository {
                  name
                  nameWithOwner
                  url
                  description
                }
              }
              ... on PullRequest {
                id
                title
                body
                url
                state
                createdAt
                updatedAt
                closedAt
                mergedAt
                author {
                  login
                  avatarUrl
                  url
                }
                assignees(first: 10) {
                  nodes {
                    login
                    avatarUrl
                    url
                  }
                }
                labels(first: 10) {
                  nodes {
                    name
                    color
                    description
                  }
                }
                milestone {
                  title
                  description
                  dueOn
                  state
                }
                repository {
                  name
                  nameWithOwner
                  url
                  description
                }
              }
              ... on DraftIssue {
                id
                title
                body
                createdAt
                updatedAt
                creator {
                  login
                  avatarUrl
                  url
                }
                assignees(first: 10) {
                  nodes {
                    login
                    avatarUrl
                    url
                  }
                }
              }
            }
            fieldValues(first: 20) {
              nodes {
                ... on ProjectV2ItemFieldTextValue {
                  text
                  field {
                    ... on ProjectV2FieldCommon {
                      name
                    }
                  }
                }
                ... on ProjectV2ItemFieldNumberValue {
                  number
                  field {
                    ... on ProjectV2FieldCommon {
                      name
                    }
                  }
                }
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                  field {
                    ... on ProjectV2FieldCommon {
                      name
                    }
                  }
                }
                ... on ProjectV2ItemFieldDateValue {
                  date
                  field {
                    ... on ProjectV2FieldCommon {
                      name
                    }
                  }
                }
              }
            }
          }
        }
        fields(first: 20) {
          nodes {
            ... on ProjectV2Field {
              id
              name
              dataType
            }
            ... on ProjectV2SingleSelectField {
              id
              name
              dataType
              options {
                id
                name
                color
              }
            }
          }
        }
        views(first: 10) {
          nodes {
            id
            name
            layout
            fields(first: 20) {
              nodes {
                ... on ProjectV2Field {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`

export async function GET() {
  try {
    const owner = process.env.GITHUB_OWNER
    const repo = process.env.GITHUB_REPO
    const projectNumber = process.env.PROJECT_NUMBER
    const token = process.env.GITHUB_TOKEN

    if (!owner || !projectNumber || !token) {
      return NextResponse.json(
        { error: 'Server configuration missing. Please set GITHUB_OWNER, GITHUB_TOKEN, and PROJECT_NUMBER environment variables.' },
        { status: 500 }
      )
    }

    const graphqlWithAuth = graphql.defaults({
      headers: {
        authorization: `token ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      },
    })

    const data: any = await graphqlWithAuth(PROJECT_QUERY, {
      owner,
      number: parseInt(projectNumber),
    })

    if (!data.user?.projectV2) {
      return NextResponse.json(
        { error: 'Project not found. Check your owner, project number, and token permissions.' },
        { status: 404 }
      )
    }

    const project = data.user.projectV2
    
    // Transform the data to match our interface
    const transformedProject = {
      id: project.id,
      number: project.number,
      title: project.title,
      description: project.shortDescription,
      url: project.url,
      shortDescription: project.shortDescription,
      readme: project.readme,
      state: project.closed ? 'CLOSED' : 'OPEN',
      public: project.public,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      owner: project.owner,
      repository: project.items.nodes[0]?.content?.repository || {
        name: repo || 'Unknown',
        fullName: `${owner}/${repo || 'Unknown'}`,
        url: `https://github.com/${owner}/${repo || ''}`,
        description: ''
      },
      fields: project.fields.nodes.map((field: any) => ({
        id: field.id,
        name: field.name,
        dataType: field.dataType,
        settings: field.options || {}
      })),
      items: project.items.nodes.map((item: any) => {
        const content = item.content
        const baseItem = {
          id: item.id,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          projectFields: item.fieldValues.nodes.map((fieldValue: any) => ({
            name: fieldValue.field?.name || 'Unknown',
            value: fieldValue.text || fieldValue.number?.toString() || fieldValue.name || fieldValue.date || null
          }))
        }

        if (!content) {
          return {
            ...baseItem,
            title: 'Draft Item',
            body: '',
            url: '',
            state: 'OPEN',
            type: 'DRAFT_ISSUE',
            assignees: [],
            labels: [],
            author: { login: 'Unknown', avatarUrl: '', url: '' }
          }
        }

        return {
          ...baseItem,
          title: content.title || 'Untitled',
          body: content.body || '',
          url: content.url || '',
          state: content.state || 'OPEN',
          type: item.type === 'PULL_REQUEST' ? 'PULL_REQUEST' : content.state !== undefined ? 'ISSUE' : 'DRAFT_ISSUE',
          closedAt: content.closedAt,
          mergedAt: content.mergedAt,
          assignees: content.assignees?.nodes || [],
          labels: content.labels?.nodes || [],
          author: content.author || content.creator || { login: 'Unknown', avatarUrl: '', url: '' },
          milestone: content.milestone
        }
      }),
      views: project.views.nodes.map((view: any) => ({
        id: view.id,
        name: view.name,
        layout: view.layout,
        fields: view.fields.nodes.map((field: any) => ({
          id: field.id,
          name: field.name
        }))
      }))
    }

    return NextResponse.json(transformedProject)
  } catch (error: any) {
    console.error('GitHub API Error:', error)
    
    if (error.status === 401) {
      return NextResponse.json(
        { error: 'Invalid GitHub token or insufficient permissions' },
        { status: 401 }
      )
    }
    
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Project not found. Check your owner and project number.' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: `Failed to fetch project data: ${error.message}` },
      { status: 500 }
    )
  }
} 