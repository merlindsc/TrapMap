# TrapMap Deployment Configuration

## Port Configuration

The TrapMap backend server is configured to run on **port 5000** by default.

### Local Development

For local development, create a `.env` file in the `backend/` directory:

```bash
# backend/.env
PORT=5000
NODE_ENV=development
# ... other environment variables
```

Or simply use the default - the server will automatically use port 5000 if PORT is not set.

### Production Deployment

When deploying to production platforms (Render, Heroku, Vercel, etc.), ensure the `PORT` environment variable is set to **5000**:

#### Render.com
1. Go to your service dashboard
2. Navigate to "Environment" tab
3. Add or update: `PORT=5000`

#### Heroku
```bash
heroku config:set PORT=5000 --app your-app-name
```

#### Vercel
In your project settings, add environment variable:
- Key: `PORT`
- Value: `5000`

#### Docker
Update your docker-compose.yml or Dockerfile to expose port 5000:
```yaml
ports:
  - "5000:5000"
environment:
  - PORT=5000
```

### Frontend Configuration

The frontend needs to know where the backend API is located. Update the frontend `.env` file:

```bash
# frontend/.env
VITE_API_URL=http://localhost:5000/api  # For development
# or
VITE_API_URL=https://your-backend-domain.com/api  # For production
```

### Verification

After starting the server, you should see:

```
╔═════════════════════════════════════════╗
║      TRAPMAP BACKEND SERVER            ║
╚═════════════════════════════════════════╝
🚀 Server running on port 5000
🌍 Environment: development
📡 API Base: http://localhost:5000/api
❤️  Health Check: http://localhost:5000/health
```

To verify the server is running correctly, test the health check endpoint:

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-12-17T...",
  "uptime": ...,
  "environment": "development"
}
```

## Common Issues

### Port Already in Use

If you see "EADDRINUSE" error, another process is using port 5000:

```bash
# Find and kill the process (Linux/Mac)
lsof -ti:5000 | xargs kill -9

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Different Port in Production

If your deployment platform assigns a different port (e.g., 10000):
1. Check your platform's environment variables
2. Update or remove the PORT variable to use the default (5000)
3. Or explicitly set `PORT=5000` in the platform settings

### CORS Issues

If the frontend cannot connect to the backend, verify:
1. The backend PORT is correctly set to 5000
2. The frontend VITE_API_URL points to the correct backend URL
3. CORS is properly configured in `backend/server.js`

## Support

For additional deployment assistance, see:
- [SUPER_ADMIN_SETUP.md](./SUPER_ADMIN_SETUP.md) - Super admin configuration
- [README.md](./README.md) - General project information
