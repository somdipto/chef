"use node";

import { ConvexError, v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { githubIntegrationValidator, githubRepositoryValidator } from "./schema";
import { getMemberByConvexMemberIdQuery } from "./sessions";

export const getGithubIntegration = query({
  args: {},
  returns: v.union(v.null(), githubIntegrationValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const existingMember = await getMemberByConvexMemberIdQuery(ctx, identity).first();
    return existingMember?.githubIntegration || null;
  },
});

export const getGithubRepositories = query({
  args: {},
  returns: v.array(githubRepositoryValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    const existingMember = await getMemberByConvexMemberIdQuery(ctx, identity).first();
    if (!existingMember) {
      return [];
    }

    const repositories = await ctx.db
      .query("githubRepositories")
      .withIndex("byMemberId", (q) => q.eq("memberId", existingMember._id))
      .collect();

    return repositories.map((repo) => repo.repository);
  },
});

export const getGithubIntegrationInternal = internalQuery({
  args: {},
  returns: v.union(v.null(), githubIntegrationValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const existingMember = await getMemberByConvexMemberIdQuery(ctx, identity).first();
    return existingMember?.githubIntegration || null;
  },
});

export const connectGithubAccount = action({
  args: {
    code: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    username: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    try {
      // Exchange code for access token
      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error("GitHub OAuth credentials not configured");
      }

      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: args.code,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        return { success: false, error: tokenData.error_description || "Failed to authenticate with GitHub" };
      }

      const accessToken = tokenData.access_token;

      // Get user information
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "Chef-App",
        },
      });

      const userData = await userResponse.json();

      if (!userResponse.ok) {
        return { success: false, error: "Failed to fetch GitHub user information" };
      }

      // Store integration in database
      const githubIntegration = {
        accessToken,
        username: userData.login,
        avatarUrl: userData.avatar_url,
        connectedAt: Date.now(),
      };

      await ctx.runMutation(internal.github.saveGithubIntegration, { githubIntegration });

      return { success: true, username: userData.login };
    } catch (error) {
      console.error("GitHub OAuth error:", error);
      return { success: false, error: "An unexpected error occurred" };
    }
  },
});

export const saveGithubIntegration = internalMutation({
  args: {
    githubIntegration: githubIntegrationValidator,
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

    await ctx.db.patch(existingMember._id, { githubIntegration: args.githubIntegration });
  },
});

export const syncGithubRepositories = action({
  args: {},
  returns: v.object({
    success: v.boolean(),
    count: v.optional(v.number()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    try {
      const githubIntegration = await ctx.runQuery(internal.github.getGithubIntegrationInternal);
      if (!githubIntegration) {
        return { success: false, error: "GitHub account not connected" };
      }

      // Fetch repositories from GitHub
      const reposResponse = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
        headers: {
          Authorization: `Bearer ${githubIntegration.accessToken}`,
          "User-Agent": "Chef-App",
        },
      });

      if (!reposResponse.ok) {
        return { success: false, error: "Failed to fetch repositories from GitHub" };
      }

      const repositories = await reposResponse.json();

      // Save repositories to database
      await ctx.runMutation(internal.github.saveGithubRepositories, { repositories });

      return { success: true, count: repositories.length };
    } catch (error) {
      console.error("GitHub sync error:", error);
      return { success: false, error: "An unexpected error occurred while syncing repositories" };
    }
  },
});

export const saveGithubRepositories = internalMutation({
  args: {
    repositories: v.array(v.any()),
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

    const now = Date.now();

    // Clear existing repositories for this member
    const existingRepos = await ctx.db
      .query("githubRepositories")
      .withIndex("byMemberId", (q) => q.eq("memberId", existingMember._id))
      .collect();

    for (const repo of existingRepos) {
      await ctx.db.delete(repo._id);
    }

    // Save new repositories
    for (const repo of args.repositories) {
      const repository = {
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description || undefined,
        private: repo.private,
        htmlUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        defaultBranch: repo.default_branch,
        language: repo.language || undefined,
        stargazersCount: repo.stargazers_count,
        forksCount: repo.forks_count,
        updatedAt: repo.updated_at,
      };

      await ctx.db.insert("githubRepositories", {
        memberId: existingMember._id,
        repository,
        syncedAt: now,
      });
    }

    // Update last sync time
    await ctx.db.patch(existingMember._id, {
      githubIntegration: {
        ...existingMember.githubIntegration!,
        lastSyncAt: now,
      },
    });
  },
});

export const disconnectGithubAccount = mutation({
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

    // Remove GitHub integration
    await ctx.db.patch(existingMember._id, { githubIntegration: undefined });

    // Remove all repositories for this member
    const repositories = await ctx.db
      .query("githubRepositories")
      .withIndex("byMemberId", (q) => q.eq("memberId", existingMember._id))
      .collect();

    for (const repo of repositories) {
      await ctx.db.delete(repo._id);
    }
  },
});