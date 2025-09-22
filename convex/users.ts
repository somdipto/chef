import { v } from 'convex/values';
import { internalMutation, mutation } from './_generated/server';
import { ConvexError } from 'convex/values';
import { getCurrentMember } from './sessions';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

export const storeGithubAccessToken = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, { code }) => {
    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
      throw new ConvexError('GitHub OAuth credentials are not configured.');
    }

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new ConvexError(`GitHub OAuth error: ${data.error_description}`);
    }

    const accessToken = data.access_token;

    const member = await getCurrentMember(ctx);

    await ctx.db.patch(member._id, {
      githubAccessToken: accessToken,
    });
  },
});

export const getGithubRepositories = query({
  handler: async (ctx) => {
    const member = await getCurrentMember(ctx);
    const accessToken = member?.githubAccessToken;

    if (!accessToken) {
      return null;
    }

    const response = await fetch('https://api.github.com/user/repos', {
      headers: {
        Authorization: `token ${accessToken}`,
        'User-Agent': 'Chef-by-Convex',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // The token is invalid, so we should clear it from the database.
        await ctx.db.patch(member._id, {
          githubAccessToken: undefined,
        });
        throw new ConvexError('GitHub access token is invalid. Please reconnect your account.');
      }
      console.error('Failed to fetch GitHub repositories', await response.text());
      throw new ConvexError('Failed to fetch GitHub repositories.');
    }

    const data = await response.json();
    return data;
  },
});

export const disconnectFromGithub = mutation({
  handler: async (ctx) => {
    const member = await getCurrentMember(ctx);
    await ctx.db.patch(member._id, {
      githubAccessToken: undefined,
    });
  },
});
