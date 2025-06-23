/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
    GITHUB_OWNER: process.env.GITHUB_OWNER || '',
    GITHUB_REPO: process.env.GITHUB_REPO || '',
    PROJECT_NUMBER: process.env.PROJECT_NUMBER || '',
  },
}

module.exports = nextConfig 