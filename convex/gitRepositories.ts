import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getMemberByConvexMemberIdQuery } from "./sessions";
import { gitRepositoryValidator } from "./schema";

export const listGitRepositoriesForCurrentMember = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("gitRepositories"),
      name: v.string(),
      url: v.string(),
      branch: v.optional(v.string()),
      isPrivate: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    const member = await getMemberByConvexMemberIdQuery(ctx, identity).first();
    if (!member) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    const repositories = await ctx.db
      .query("gitRepositories")
      .withIndex("byMemberId", (q) => q.eq("memberId", member._id))
      .order("desc")
      .collect();

    return repositories.map((repo) => ({
      _id: repo._id,
      name: repo.name,
      url: repo.url,
      branch: repo.branch,
      isPrivate: repo.isPrivate,
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
    }));
  },
});

export const addGitRepositoryForCurrentMember = mutation({
  args: {
    repository: gitRepositoryValidator,
  },
  returns: v.id("gitRepositories"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    const member = await getMemberByConvexMemberIdQuery(ctx, identity).first();
    if (!member) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    // Check if repository with same name already exists for this member
    const existingRepo = await ctx.db
      .query("gitRepositories")
      .withIndex("byMemberIdAndName", (q) => q.eq("memberId", member._id).eq("name", args.repository.name))
      .first();

    if (existingRepo) {
      throw new ConvexError({
        code: "InvalidRequest",
        message: "A repository with this name already exists",
      });
    }

    const now = Date.now();
    const repositoryId = await ctx.db.insert("gitRepositories", {
      memberId: member._id,
      name: args.repository.name,
      url: args.repository.url,
      branch: args.repository.branch || "main",
      accessToken: args.repository.accessToken,
      isPrivate: args.repository.isPrivate,
      createdAt: now,
      updatedAt: now,
    });

    return repositoryId;
  },
});

export const updateGitRepositoryForCurrentMember = mutation({
  args: {
    repositoryId: v.id("gitRepositories"),
    repository: gitRepositoryValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    const member = await getMemberByConvexMemberIdQuery(ctx, identity).first();
    if (!member) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    const repository = await ctx.db.get(args.repositoryId);
    if (!repository || repository.memberId !== member._id) {
      throw new ConvexError({
        code: "NotAuthorized",
        message: "Repository not found or not authorized",
      });
    }

    // Check if repository with same name already exists for this member (excluding current)
    const existingRepo = await ctx.db
      .query("gitRepositories")
      .withIndex("byMemberIdAndName", (q) => q.eq("memberId", member._id).eq("name", args.repository.name))
      .first();

    if (existingRepo && existingRepo._id !== args.repositoryId) {
      throw new ConvexError({
        code: "InvalidRequest",
        message: "A repository with this name already exists",
      });
    }

    await ctx.db.patch(args.repositoryId, {
      name: args.repository.name,
      url: args.repository.url,
      branch: args.repository.branch || "main",
      accessToken: args.repository.accessToken,
      isPrivate: args.repository.isPrivate,
      updatedAt: Date.now(),
    });
  },
});

export const deleteGitRepositoryForCurrentMember = mutation({
  args: {
    repositoryId: v.id("gitRepositories"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    const member = await getMemberByConvexMemberIdQuery(ctx, identity).first();
    if (!member) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    const repository = await ctx.db.get(args.repositoryId);
    if (!repository || repository.memberId !== member._id) {
      throw new ConvexError({
        code: "NotAuthorized",
        message: "Repository not found or not authorized",
      });
    }

    await ctx.db.delete(args.repositoryId);
  },
});

export const getGitRepositoryForCurrentMember = query({
  args: {
    repositoryId: v.id("gitRepositories"),
  },
  returns: v.union(
    v.object({
      _id: v.id("gitRepositories"),
      name: v.string(),
      url: v.string(),
      branch: v.optional(v.string()),
      accessToken: v.optional(v.string()),
      isPrivate: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const member = await getMemberByConvexMemberIdQuery(ctx, identity).first();
    if (!member) {
      return null;
    }

    const repository = await ctx.db.get(args.repositoryId);
    if (!repository || repository.memberId !== member._id) {
      return null;
    }

    return {
      _id: repository._id,
      name: repository.name,
      url: repository.url,
      branch: repository.branch,
      accessToken: repository.accessToken,
      isPrivate: repository.isPrivate,
      createdAt: repository.createdAt,
      updatedAt: repository.updatedAt,
    };
  },
});
