import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { getCurrentMember } from "./sessions";
import { ConvexError } from "convex/values";

export const getGithubConnection = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({ username: v.string(), avatarUrl: v.optional(v.string()) }),
  ),
  handler: async (ctx) => {
    const member = await getCurrentMember(ctx);
    return member.githubAuth
      ? { username: member.githubAuth.username, avatarUrl: member.githubAuth.avatarUrl }
      : null;
  },
});

export const disconnectGithub = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const member = await getCurrentMember(ctx);
    await ctx.db.patch(member._id, { githubAuth: undefined });
    return null;
  },
});

export const exchangeCodeForToken = action({
  args: {
    code: v.string(),
    redirectUri: v.string(),
  },
  returns: v.object({
    access_token: v.string(),
    token_type: v.string(),
    scope: v.string(),
  }),
  handler: async (_ctx, args) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Missing GitHub OAuth env vars (GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET)");
    }
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: args.code,
        redirect_uri: args.redirectUri,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub token exchange failed: ${res.status} ${body}`);
    }
    return (await res.json()) as { access_token: string; token_type: string; scope: string };
  },
});

export const saveGithubAuth = internalMutation({
  args: {
    accessToken: v.string(),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const member = await getCurrentMember(ctx);
    await ctx.db.patch(member._id, {
      githubAuth: {
        accessToken: args.accessToken,
        username: args.username,
        avatarUrl: args.avatarUrl,
      },
    });
    return null;
  },
});

export const listRepos = action({
  args: {
    visibility: v.optional(v.union(v.literal("all"), v.literal("public"), v.literal("private"))),
  },
  returns: v.array(
    v.object({
      id: v.number(),
      name: v.string(),
      full_name: v.string(),
      private: v.boolean(),
      default_branch: v.string(),
      owner_login: v.string(),
      clone_url: v.string(),
      html_url: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const member = await getCurrentMember(ctx);
    if (!member.githubAuth) {
      throw new ConvexError({ code: "NotAuthorized", message: "GitHub not connected" });
    }
    const url = new URL("https://api.github.com/user/repos");
    url.searchParams.set("per_page", "100");
    url.searchParams.set("sort", "updated");
    if (args.visibility && args.visibility !== "all") {
      url.searchParams.set("visibility", args.visibility);
    }
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${member.githubAuth.accessToken}`,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to list repos: ${res.status} ${body}`);
    }
    const json = (await res.json()) as Array<any>;
    return json.map((r) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      private: r.private,
      default_branch: r.default_branch,
      owner_login: r.owner?.login ?? "",
      clone_url: r.clone_url,
      html_url: r.html_url,
    }));
  },
});

export const repoArchiveUrl = action({
  args: { fullName: v.string(), ref: v.optional(v.string()) },
  returns: v.string(),
  handler: async (ctx, args) => {
    const member = await getCurrentMember(ctx);
    if (!member.githubAuth) {
      throw new ConvexError({ code: "NotAuthorized", message: "GitHub not connected" });
    }
    const ref = args.ref ?? "HEAD";
    const apiUrl = `https://api.github.com/repos/${args.fullName}/zipball/${encodeURIComponent(ref)}`;
    return apiUrl;
  },
});

