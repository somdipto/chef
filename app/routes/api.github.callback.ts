import { json, type LoaderFunctionArgs } from '@vercel/remix';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const GITHUB_CLIENT_ID = globalThis.process.env.GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = globalThis.process.env.GITHUB_CLIENT_SECRET;

  if (!code) {
    return json({ error: 'No authorization code provided' }, { status: 400 });
  }

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    throw new Error('Missing required environment variables (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET)');
  }

  try {
    // Exchange the code for a token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        state,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('GitHub token exchange failed:', errorData);
      return json({ error: 'Failed to exchange code for token' }, { status: 500 });
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('GitHub OAuth error:', tokenData.error);
      return json({ error: tokenData.error_description || tokenData.error }, { status: 400 });
    }

    const accessToken = tokenData.access_token;

    // Get user information
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch GitHub user info');
      return json({ error: 'Failed to fetch user information' }, { status: 500 });
    }

    const userData = await userResponse.json();

    // Return the token and user data as JSON
    return json({
      accessToken,
      user: {
        id: userData.id,
        login: userData.login,
        name: userData.name,
        avatar_url: userData.avatar_url,
        email: userData.email,
      }
    });
  } catch (error) {
    console.error('Error in GitHub OAuth callback:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}