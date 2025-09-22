import { ConvexError, v } from "convex/values";
import { action, query, mutation } from "./_generated/server";
import { getMemberByConvexMemberIdQuery } from "./sessions";

// GitHub API base URL
const GITHUB_API_BASE = 'https://api.github.com';

// Helper function to get GitHub token from localStorage or session
async function getGitHubToken(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
  }

  const existingMember = await getMemberByConvexMemberIdQuery(ctx, identity).first();
  if (!existingMember) {
    throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
  }

  return existingMember.githubToken;
}

// Fetch user's repositories from GitHub
export const getUserRepositories = action({
  args: {},
  returns: v.array(v.object({
    id: v.number(),
    name: v.string(),
    full_name: v.string(),
    description: v.union(v.string(), v.null()),
    private: v.boolean(),
    html_url: v.string(),
    clone_url: v.string(),
    ssh_url: v.string(),
    default_branch: v.string(),
    language: v.union(v.string(), v.null()),
    updated_at: v.string(),
  })),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    const existingMember = await getMemberByConvexMemberIdQuery(ctx, identity).first();
    if (!existingMember?.githubToken) {
      throw new ConvexError({ code: "NotAuthorized", message: "GitHub not connected" });
    }

    try {
      const response = await fetch(`${GITHUB_API_BASE}/user/repos?type=owner&sort=updated&per_page=100`, {
        headers: {
          'Authorization': `Bearer ${existingMember.githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Chef-App/1.0',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new ConvexError({ code: "Unauthorized", message: "GitHub token expired or invalid" });
        }
        throw new ConvexError({ code: "InternalError", message: "Failed to fetch repositories" });
      }

      const repositories = await response.json();
      return repositories;
    } catch (error) {
      console.error('Error fetching GitHub repositories:', error);
      throw new ConvexError({ code: "InternalError", message: "Failed to fetch repositories" });
    }
  },
});

// Fetch repository contents
export const getRepositoryContents = action({
  args: {
    owner: v.string(),
    repo: v.string(),
    path: v.optional(v.string()),
    ref: v.optional(v.string()),
  },
  returns: v.array(v.object({
    name: v.string(),
    path: v.string(),
    type: v.string(),
    size: v.union(v.number(), v.null()),
    download_url: v.union(v.string(), v.null()),
    sha: v.string(),
    url: v.string(),
  })),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    const existingMember = await getMemberByConvexMemberIdQuery(ctx, identity).first();
    if (!existingMember?.githubToken) {
      throw new ConvexError({ code: "NotAuthorized", message: "GitHub not connected" });
    }

    const queryParams = new URLSearchParams();
    if (args.path) queryParams.append('path', args.path);
    if (args.ref) queryParams.append('ref', args.ref);

    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${args.owner}/${args.repo}/contents?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${existingMember.githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Chef-App/1.0',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new ConvexError({ code: "Unauthorized", message: "GitHub token expired or invalid" });
        }
        throw new ConvexError({ code: "InternalError", message: "Failed to fetch repository contents" });
      }

      const contents = await response.json();

      // GitHub returns a single object for files, but an array for directories
      return Array.isArray(contents) ? contents : [contents];
    } catch (error) {
      console.error('Error fetching repository contents:', error);
      throw new ConvexError({ code: "InternalError", message: "Failed to fetch repository contents" });
    }
  },
});

// Get repository file content
export const getFileContent = action({
  args: {
    owner: v.string(),
    repo: v.string(),
    path: v.string(),
    ref: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    const existingMember = await getMemberByConvexMemberIdQuery(ctx, identity).first();
    if (!existingMember?.githubToken) {
      throw new ConvexError({ code: "NotAuthorized", message: "GitHub not connected" });
    }

    const queryParams = new URLSearchParams();
    if (args.ref) queryParams.append('ref', args.ref);

    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${args.owner}/${args.repo}/contents/${args.path}?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${existingMember.githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Chef-App/1.0',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new ConvexError({ code: "Unauthorized", message: "GitHub token expired or invalid" });
        }
        throw new ConvexError({ code: "InternalError", message: "Failed to fetch file content" });
      }

      const fileData = await response.json();

      if (fileData.type !== 'file') {
        throw new ConvexError({ code: "BadRequest", message: "Path is not a file" });
      }

      // Decode base64 content
      return atob(fileData.content.replace(/\n/g, ''));
    } catch (error) {
      console.error('Error fetching file content:', error);
      throw new ConvexError({ code: "InternalError", message: "Failed to fetch file content" });
    }
  },
});

// Connect GitHub account (store token)
export const connectGitHub = mutation({
  args: {
    githubToken: v.string(),
    githubUser: v.object({
      id: v.number(),
      login: v.string(),
      name: v.union(v.string(), v.null()),
      avatar_url: v.string(),
      email: v.union(v.string(), v.null()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    const existingMember = await getMemberByConvexMemberIdQuery(ctx, identity).first();
    if (!existingMember) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    await ctx.db.patch(existingMember._id, {
      githubToken: args.githubToken,
      githubUser: args.githubUser,
    });
  },
});

// Disconnect GitHub account
export const disconnectGitHub = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    const existingMember = await getMemberByConvexMemberIdQuery(ctx, identity).first();
    if (!existingMember) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    await ctx.db.patch(existingMember._id, {
      githubToken: undefined,
      githubUser: undefined,
    });
  },
});

// Get GitHub connection status
export const getGitHubConnection = query({
  args: {},
  returns: v.union(v.null(), v.object({
    githubToken: v.string(),
    githubUser: v.object({
      id: v.number(),
      login: v.string(),
      name: v.union(v.string(), v.null()),
      avatar_url: v.string(),
      email: v.union(v.string(), v.null()),
    }),
  })),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const existingMember = await getMemberByConvexMemberIdQuery(ctx, identity).first();
    if (!existingMember) {
      return null;
    }

    return existingMember.githubToken && existingMember.githubUser ? {
      githubToken: existingMember.githubToken,
      githubUser: existingMember.githubUser,
    } : null;
  },
});