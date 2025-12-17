# TrapMap Deployment Configuration

## Port Configuration

The TrapMap backend server defaults to **port 5000** for local development. In production, it will use the PORT environment variable if provided by your hosting platform.

### Local Development

For local development, the server automatically uses port 5000. You can optionally specify it in a `.env` file:

```bash
# backend/.env (optional for local development)
PORT=5000
NODE_ENV=development
# ... other environment variables
```

If you don't set PORT, the server will use 5000 by default.

### Production Deployment

The server is designed to work with both fixed ports and dynamically assigned ports.

#### Platforms with Dynamic Port Assignment (Heroku, Railway)

**Do NOT set a PORT environment variable**. These platforms automatically assign a port and pass it via the PORT environment variable. The server will automatically use it.

- Heroku: Leave PORT unset (uses `$PORT` automatically)
- Railway: Leave PORT unset (uses `$PORT` automatically)

#### Platforms with Fixed Ports (Render, Vercel, VPS, Docker)

If you need to use a specific port (e.g., reverting from port 10000 to port 5000), set the PORT environment variable:

##### Render.com
1. Go to your service dashboard
2. Navigate to "Environment" tab
3. Add or update: `PORT=5000` (or remove PORT to use the default)

##### Vercel
In your project settings, add environment variable:
- Key: `PORT`
- Value: `5000` (if needed)

##### VPS/Docker
Update your configuration to use port 5000:
```yaml
# docker-compose.yml
ports:
  - "5000:5000"
environment:
  - PORT=5000  # Optional - will default to 5000 anyway
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

### Common Issues

### Port Already in Use

If you see "EADDRINUSE" error, another process is using port 5000:

```bash
# Find and kill the process (Linux/Mac)
lsof -ti:5000 | xargs kill -9

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Changing from Another Port (e.g., 10000 to 5000)

If your deployment is currently using a different port and you want to use port 5000:

1. **Check current PORT setting**: Look in your platform's environment variables
2. **Update or remove PORT variable**:
   - If on a platform with dynamic ports (Heroku): Remove the PORT variable
   - If on a platform with fixed ports (Render, VPS): Set `PORT=5000`
3. **Redeploy** your application
4. **Update frontend**: Ensure `VITE_API_URL` points to the new port

**Note**: The server defaults to port 5000, so removing the PORT environment variable will automatically use 5000.

### CORS Issues

If the frontend cannot connect to the backend, verify:
1. The backend PORT is correctly configured
2. The frontend VITE_API_URL points to the correct backend URL and port
3. CORS is properly configured in `backend/server.js`

### Dynamic Port Assignment

Some platforms require the app to listen on their assigned port:
- **Never** hardcode the port in your application code
- **Always** respect the PORT environment variable when provided
- The current implementation correctly handles both scenarios

## Support

For additional deployment assistance, see:
- [SUPER_ADMIN_SETUP.md](./SUPER_ADMIN_SETUP.md) - Super admin configuration
- [README.md](./README.md) - General project information
