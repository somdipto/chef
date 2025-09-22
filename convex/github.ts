import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";

// Table: githubTokens stored in convex schema will have _id, _creationTime, token, memberId

export const tokenForCurrentMember = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({ token: v.string() })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const existing = await ctx.db
      .query("githubTokens")
      .withIndex("by_memberId", (q) => q.eq("memberId", identity.subject))
      .unique();
    if (!existing) return null;
    return { token: existing.token } as const;
  },
});

export const setTokenForCurrentMember = mutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("githubTokens")
      .withIndex("by_memberId", (q) => q.eq("memberId", identity.subject))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { token: args.token });
    } else {
      await ctx.db.insert("githubTokens", {
        memberId: identity.subject,
        token: args.token,
      });
    }
    return null;
  },
});

export const deleteTokenForCurrentMember = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("githubTokens")
      .withIndex("by_memberId", (q) => q.eq("memberId", identity.subject))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});

export const fetchRepos = action({
  args: {},
  returns: v.array(
    v.object({
      id: v.number(),
      name: v.string(),
      full_name: v.string(),
      private: v.boolean(),
      html_url: v.string(),
    })
  ),
  handler: async (ctx) => {
    "use node";
    const tokenInfo = await ctx.runQuery(api.github.tokenForCurrentMember, {});
    if (!tokenInfo) {
      return [];
    }
    const token = tokenInfo.token;

    const res = await fetch("https://api.github.com/user/repos?per_page=100", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (!res.ok) {
      console.error("GitHub repo fetch failed", await res.text());
      return [];
    }
    const data = await res.json();
    return data.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      html_url: repo.html_url,
    }));
  },
});