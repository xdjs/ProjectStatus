# GitHub Project Dashboard

A modern, real-time web dashboard that displays GitHub project information, perfect for public displays and TV screens. Visitors can view the dashboard without any authentication - just configure once and deploy!

## ✨ Features

- 🚀 **Real-time synchronization** with GitHub projects (30-second updates)
- 📊 **Project statistics** with visual metrics
- 📋 **Kanban board view** with automated column organization  
- 🎨 **Modern, responsive UI** built with Tailwind CSS
- 🔒 **Secure server-side authentication** (visitors don't need GitHub access)
- ⚡ **Fast deployment** on Vercel
- 📱 **Mobile-friendly** responsive design
- 🖥️ **Perfect for public displays** and TV dashboards

## 🚀 Quick Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd ProjectStatus
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file:

```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_OWNER=microsoft
GITHUB_REPO=vscode
PROJECT_NUMBER=1
```

### 3. Run

```bash
npm run dev
```

Visit `http://localhost:3000` - no login required!

## 🔧 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GITHUB_TOKEN` | Personal access token with `repo` and `read:project` scopes | `ghp_xxxxx...` |
| `GITHUB_OWNER` | Repository owner or organization name | `microsoft` |
| `GITHUB_REPO` | Repository name (optional, for display) | `vscode` |
| `PROJECT_NUMBER` | Project number from GitHub URL | `1` |

### Creating a GitHub Personal Access Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name (e.g., "Project Dashboard")
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `read:project` (Read access to projects)
5. Generate and copy the token

### Finding Your Project Number

Look at your GitHub project URL:
```
https://github.com/users/YOUR_USERNAME/projects/1
                                              ↑
                                    PROJECT_NUMBER
```

## 🚀 Deploy to Vercel

1. Push your code to GitHub
2. Import project on [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard:
   - `GITHUB_TOKEN`
   - `GITHUB_OWNER` 
   - `GITHUB_REPO`
   - `PROJECT_NUMBER`
4. Deploy!

**That's it!** Anyone can now visit your Vercel URL to see the live dashboard.

## 🎯 Perfect for Public Displays

This dashboard is designed for:
- **Office TV displays** showing team project status
- **Public project showcases** 
- **Conference presentations** of your GitHub projects
- **Team dashboards** in common areas
- **Client demonstrations** of project progress

No visitor authentication required - just pure, real-time project visualization!

## 🔄 How It Works

1. **Server-side authentication**: Your GitHub token stays secure on the server
2. **Real-time updates**: Polls GitHub API every 30 seconds
3. **Smart organization**: Automatically organizes items by status/state
4. **Responsive design**: Works on any screen size
5. **Public access**: Anyone can view, no login needed

## 🎨 Customization

### Update Frequency
Change polling interval in `src/app/page.tsx`:
```typescript
const interval = setInterval(fetchProjectData, 30000) // 30 seconds
```

### Styling
Modify colors and themes in:
- `src/app/globals.css` - CSS variables and global styles
- `tailwind.config.js` - Tailwind configuration

### Board Layout
Customize column organization in `src/components/ProjectBoard.tsx`

## 🛠️ Troubleshooting

### Common Issues

**"Server configuration missing" error**
- ✅ Set all required environment variables
- ✅ Restart the development server
- ✅ Check that variables are in `.env.local` (not `.env`)

**"Project not found" error**
- ✅ Verify your GitHub token has correct permissions
- ✅ Check that the project number is correct
- ✅ Ensure the project exists and is accessible

**"Invalid GitHub token" error**
- ✅ Generate a new personal access token
- ✅ Ensure `repo` and `read:project` scopes are selected
- ✅ Check that the token hasn't expired

### Rate Limits
GitHub API allows 5,000 requests per hour. With 30-second polling, you'll use ~120 requests/hour - well within limits.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

**Ready to showcase your GitHub projects?** Set up your environment variables and deploy! 🚀 