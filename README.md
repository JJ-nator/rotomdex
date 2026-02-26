# ⚡ ROTOMDEX

A private futuristic dashboard for accessing Render-deployed applications.

## Features

- 🔐 Secure login with auto-generated credentials
- 📦 App cards for all your Render services
- 🎨 Futuristic anime-tech UI design
- ↻ Auto-scan Render for deployed apps
- 📱 Fully responsive

## Deployment

### Render (Recommended)

1. Create a new Web Service on Render
2. Connect this repository
3. Set environment variables:
   - `GH_TOKEN` - GitHub personal access token
   - `RENDER_API_KEY` - Render API key
4. Deploy!

### Local Development

```bash
npm install
npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 3000) | No |
| `GH_TOKEN` | GitHub token for repo scanning | No |
| `RENDER_API_KEY` | Render API key for service discovery | No |
| `SESSION_SECRET` | Session encryption key | No (auto-generated) |

## Credentials

On first run, credentials are generated and saved to:
- `data/credentials.json` (hashed)
- `credentials.txt` (plaintext for initial setup)

Check server logs for the generated username and password.

## Adding Apps Manually

Edit `data/apps.json`:

```json
{
  "apps": [
    {
      "name": "My App",
      "description": "App description",
      "url": "https://my-app.onrender.com",
      "repo": "https://github.com/user/repo",
      "icon": "🚀"
    }
  ]
}
```

## License

MIT
