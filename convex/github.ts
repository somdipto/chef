"use node";
import { v } from "convex/values";
import { action, httpAction, internalMutation, mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { getCurrentMember } from "./sessions";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

export const isConnected = query({
  args: {},
  returns: v.object({ connected: v.boolean(), login: v.optional(v.string()) }),
  handler: async (ctx) => {
    const member = await getCurrentMember(ctx);
    const tokenRow = await ctx.db
      .query("githubTokens")
      .withIndex("byMemberId", (q) => q.eq("memberId", member._id))
      .unique();
    if (!tokenRow) return { connected: false } as const;

    try {
      const userResp = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${tokenRow.accessToken}`, Accept: "application/vnd.github+json" },
      });
      if (!userResp.ok) return { connected: true } as const;
      const user = (await userResp.json()) as { login?: string };
      return { connected: true, login: user.login } as const;
    } catch {
      return { connected: true } as const;
    }
  },
});

export const exchangeCode = mutation({
  args: { code: v.string(), redirectUri: v.string() },
  returns: v.null(),
  handler: async (ctx, { code, redirectUri }) => {
    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
      throw new ConvexError("Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET");
    }
    const member = await getCurrentMember(ctx);
    const resp = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code, redirect_uri: redirectUri }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new ConvexError(`GitHub token exchange failed: ${resp.status} ${text}`);
    }
    const data = (await resp.json()) as {
      access_token: string;
      token_type?: string;
      scope?: string;
    };
    const existing = await ctx.db
      .query("githubTokens")
      .withIndex("byMemberId", (q) => q.eq("memberId", member._id))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        accessToken: data.access_token,
        tokenType: data.token_type,
        scope: data.scope,
      });
    } else {
      await ctx.db.insert("githubTokens", {
        memberId: member._id,
        accessToken: data.access_token,
        tokenType: data.token_type,
        scope: data.scope,
      });
    }
    return null;
  },
});

export const disconnect = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const member = await getCurrentMember(ctx);
    const existing = await ctx.db
      .query("githubTokens")
      .withIndex("byMemberId", (q) => q.eq("memberId", member._id))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});

export const listRepos = action({
  args: { perPage: v.optional(v.number()), page: v.optional(v.number()) },
  handler: async (ctx, { perPage = 50, page = 1 }) => {
    const member = await getCurrentMember(ctx as any);
    const tokenRow = await ctx.db
      .query("githubTokens")
      .withIndex("byMemberId", (q) => q.eq("memberId", member._id))
      .unique();
    if (!tokenRow) {
      throw new ConvexError("GitHub not connected");
    }
    const url = new URL("https://api.github.com/user/repos");
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("page", String(page));
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${tokenRow.accessToken}`, Accept: "application/vnd.github+json" },
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new ConvexError(`Failed to list repos: ${resp.status} ${text}`);
    }
    return (await resp.json()) as Array<{
      id: number;
      name: string;
      full_name: string;
      private: boolean;
      owner: { login: string };
      default_branch: string;
    }>;
  },
});

export const zipballProxy = httpAction(async (ctx, req) => {
  const url = new URL(req.url);
  const owner = url.searchParams.get("owner");
  const repo = url.searchParams.get("repo");
  const ref = url.searchParams.get("ref") ?? "main";
  if (!owner || !repo) {
    return new Response(JSON.stringify({ error: "owner and repo are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const member = await getCurrentMember(ctx as any);
    const tokenRow = await ctx.db
      .query("githubTokens")
      .withIndex("byMemberId", (q) => q.eq("memberId", member._id))
      .unique();
    if (!tokenRow) {
      return new Response(JSON.stringify({ error: "GitHub not connected" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const ghUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${encodeURIComponent(ref)}`;
    const ghResp = await fetch(ghUrl, {
      headers: { Authorization: `Bearer ${tokenRow.accessToken}`, Accept: "application/vnd.github+json" },
    });
    if (!ghResp.ok) {
      const text = await ghResp.text();
      return new Response(JSON.stringify({ error: `GitHub error: ${ghResp.status} ${text}` }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }
    const body = await ghResp.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${owner}-${repo}.zip"`,
      },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

