# GitHub Integration Setup

This guide will help you set up GitHub OAuth integration for Chef so users can connect their GitHub accounts and import repositories.

## 1. Create a GitHub OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: Chef (or your preferred name)
   - **Homepage URL**: Your Chef deployment URL (e.g., `https://your-chef-domain.com`)
   - **Application description**: AI-powered full-stack development with GitHub integration
   - **Authorization callback URL**: `https://your-chef-domain.com/api/github/callback`

4. Click "Register application"
5. Note down the **Client ID** and generate a **Client Secret**

## 2. Configure Environment Variables

Add the following environment variables to your deployment:

### Backend Environment Variables (Convex)
```bash
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### Frontend Environment Variables (Vite)
```bash
VITE_GITHUB_CLIENT_ID=your_github_client_id
```

## 3. Deploy the Changes

After setting up the environment variables, deploy your Convex functions and frontend:

```bash
# Deploy Convex functions
npx convex deploy

# Deploy frontend (depends on your hosting platform)
npm run build
```

## 4. Test the Integration

1. Go to the Settings page in your Chef application
2. Look for the "GitHub Integration" card
3. Click "Connect GitHub Account"
4. You should be redirected to GitHub for authorization
5. After granting permissions, you'll be redirected back to Chef
6. Your repositories should appear in the GitHub Integration section
7. You can now sync repositories and import them as new Chef projects

## Security Notes

- The GitHub Client Secret should be kept secure and not exposed to the frontend
- The integration stores GitHub access tokens securely in the Convex database
- Users can disconnect their GitHub account at any time from the settings page
- All API calls to GitHub are made server-side to protect user tokens

## Troubleshooting

### "GitHub integration not configured" error
- Make sure `VITE_GITHUB_CLIENT_ID` is set in your frontend environment variables

### OAuth callback errors
- Verify the callback URL in your GitHub OAuth app matches your deployment URL
- Check that the route `/api/github/callback` is accessible

### Repository sync failures
- Check that the `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are correctly set in Convex
- Verify the user has granted the necessary permissions (repo, user:email)

## Features

Once set up, users can:

1. **Connect GitHub Account**: Secure OAuth integration with GitHub
2. **View Repositories**: See all their public and private repositories
3. **Sync Repositories**: Refresh the repository list from GitHub
4. **Import Projects**: Select repositories to import as new Chef projects
5. **Repository Details**: View repository information including:
   - Stars and forks count
   - Primary programming language
   - Last updated date
   - Public/private status
6. **Disconnect Account**: Remove GitHub integration and clear stored data

The imported repositories will be set up as new Chef projects with appropriate prompts to help users continue working on their existing codebases.