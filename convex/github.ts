"use node";
import { action, mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";

export const getConnection = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      connected: v.literal(true),
      username: v.optional(v.string()),
      avatarUrl: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const member = await ctx.db
      .query("convexMembers")
      .withIndex("byConvexMemberId", (q) => q.eq("convexMemberId", identity.subject))
      .first();
    if (!member || !member.github) return null;
    return { connected: true as const, username: member.github.username, avatarUrl: member.github.avatarUrl };
  },
});

export const saveAccessToken = mutation({
  args: {
    accessToken: v.string(),
    username: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    const member = await ctx.db
      .query("convexMembers")
      .withIndex("byConvexMemberId", (q) => q.eq("convexMemberId", identity.subject))
      .first();
    if (!member) throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    await ctx.db.patch(member._id, {
      github: { accessToken: args.accessToken, username: args.username, avatarUrl: args.avatarUrl },
    });
    return null;
  },
});

export const disconnect = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    const member = await ctx.db
      .query("convexMembers")
      .withIndex("byConvexMemberId", (q) => q.eq("convexMemberId", identity.subject))
      .first();
    if (!member) throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    await ctx.db.patch(member._id, { github: undefined });
    return null;
  },
});

export const exchangeCode = action({
  args: {
    code: v.string(),
    redirectUri: v.string(),
  },
  returns: v.object({ accessToken: v.string(), username: v.optional(v.string()), avatarUrl: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET");
    }

    const tokenResp = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code: args.code, redirect_uri: args.redirectUri }),
    });
    if (!tokenResp.ok) {
      throw new Error(`GitHub token exchange failed: ${await tokenResp.text()}`);
    }
    const tokenJson = (await tokenResp.json()) as { access_token?: string; token_type?: string; scope?: string };
    if (!tokenJson.access_token) {
      throw new Error("No access_token in GitHub response");
    }

    // Fetch the user to store basic profile
    const userResp = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}`, Accept: "application/vnd.github+json" },
    });
    let username: string | undefined = undefined;
    let avatarUrl: string | undefined = undefined;
    if (userResp.ok) {
      const userJson = (await userResp.json()) as { login?: string; avatar_url?: string };
      username = userJson.login;
      avatarUrl = userJson.avatar_url;
    }

    return { accessToken: tokenJson.access_token, username, avatarUrl };
  },
});

export const listRepos = action({
  args: { perPage: v.optional(v.number()) },
  returns: v.array(
    v.object({
      id: v.number(),
      name: v.string(),
      full_name: v.string(),
      default_branch: v.string(),
      clone_url: v.string(),
      private: v.boolean(),
      owner: v.object({ login: v.string() }),
    }),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    const member = await ctx.db
      .query("convexMembers")
      .withIndex("byConvexMemberId", (q) => q.eq("convexMemberId", identity.subject))
      .first();
    if (!member?.github?.accessToken) return [];
    const perPage = args.perPage ?? 50;
    const resp = await fetch(`https://api.github.com/user/repos?per_page=${perPage}&sort=updated`, {
      headers: { Authorization: `Bearer ${member.github.accessToken}`, Accept: "application/vnd.github+json" },
    });
    if (!resp.ok) {
      throw new Error(`Failed to list repositories: ${await resp.text()}`);
    }
    const repos = (await resp.json()) as any[];
    return repos.map((r) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      default_branch: r.default_branch,
      clone_url: r.clone_url,
      private: !!r.private,
      owner: { login: r.owner?.login },
    }));
  },
});

export const downloadRepoArchive = action({
  args: { fullName: v.string(), ref: v.optional(v.string()) },
  returns: v.bytes(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    const member = await ctx.db
      .query("convexMembers")
      .withIndex("byConvexMemberId", (q) => q.eq("convexMemberId", identity.subject))
      .first();
    if (!member?.github?.accessToken) {
      throw new ConvexError({ code: "NotAuthorized", message: "No GitHub connection" });
    }
    const ref = args.ref ? `/${encodeURIComponent(args.ref)}` : "";
    const url = `https://api.github.com/repos/${args.fullName}/zipball${ref}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${member.github.accessToken}`, Accept: "application/vnd.github+json" },
    });
    if (!resp.ok) {
      throw new Error(`Failed to download repository archive: ${await resp.text()}`);
    }
    const bytes = await resp.arrayBuffer();
    return bytes;
  },
});

