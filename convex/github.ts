import { ConvexError, v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getCurrentMember } from "./sessions";

export const getConnection = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      login: v.string(),
      avatarUrl: v.string(),
      id: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const member = await getCurrentMember(ctx);
    const gh = member.github;
    if (!gh) return null;
    return { login: gh.login, avatarUrl: gh.avatarUrl, id: gh.id };
  },
});

export const disconnect = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const member = await getCurrentMember(ctx);
    await ctx.db.patch(member._id, { github: undefined });
  },
});

export const exchangeCode = action({
  args: {
    code: v.string(),
    redirectUri: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, { code, redirectUri }) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new ConvexError({ code: "ConfigError", message: "Missing GitHub OAuth env vars" } as any);
    }

    const tokenResp = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "convex-chef",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenResp.ok) {
      const body = await tokenResp.text();
      throw new Error(`GitHub token exchange failed: ${tokenResp.status} ${body}`);
    }
    const tokenJson = (await tokenResp.json()) as { access_token?: string; token_type?: string; scope?: string };
    const accessToken = tokenJson.access_token;
    if (!accessToken) {
      throw new Error("GitHub token exchange did not return access_token");
    }

    const userResp = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "convex-chef",
      },
    });
    if (!userResp.ok) {
      const body = await userResp.text();
      throw new Error(`GitHub user fetch failed: ${userResp.status} ${body}`);
    }
    const user = (await userResp.json()) as { login: string; id: number | string; avatar_url: string };

    await ctx.runMutation(internal.github.saveConnection, {
      accessToken,
      login: user.login,
      avatarUrl: user.avatar_url,
      id: String(user.id),
    });
    return true;
  },
});

export const listRepos = action({
  args: {
    perPage: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      id: v.union(v.string(), v.number()),
      name: v.string(),
      full_name: v.string(),
      private: v.boolean(),
      html_url: v.string(),
      default_branch: v.string(),
      owner: v.object({ login: v.string() }),
    }),
  ),
  handler: async (ctx, args) => {
    const token = await ctx.runQuery(internal.github.getTokenForCurrentMember, {});
    if (!token) {
      throw new ConvexError({ code: "NotAuthorized", message: "GitHub not connected" });
    }
    const perPage = Math.min(Math.max(args.perPage ?? 100, 1), 100);
    const resp = await fetch(`https://api.github.com/user/repos?per_page=${perPage}&sort=updated`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "convex-chef",
      },
    });
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`GitHub list repos failed: ${resp.status} ${body}`);
    }
    const repos = (await resp.json()) as Array<any>;
    return repos.map((r) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      private: !!r.private,
      html_url: r.html_url,
      default_branch: r.default_branch || "main",
      owner: { login: r.owner?.login ?? "" },
    }));
  },
});

export const saveConnection = internalMutation({
  args: {
    accessToken: v.string(),
    login: v.string(),
    avatarUrl: v.string(),
    id: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { accessToken, login, avatarUrl, id }) => {
    const member = await getCurrentMember(ctx);
    await ctx.db.patch(member._id, {
      github: { accessToken, login, avatarUrl, id },
    });
  },
});

export const getTokenForCurrentMember = internalQuery({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) => {
    const member = await getCurrentMember(ctx);
    return member.github?.accessToken ?? null;
  },
});

export const getTokenForSession = internalQuery({
  args: { sessionId: v.id("sessions") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session || !session.memberId) {
      return null;
    }
    const member = await ctx.db.get(session.memberId);
    return member?.github?.accessToken ?? null;
  },
});

