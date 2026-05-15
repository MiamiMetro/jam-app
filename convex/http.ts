import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent, createAuth, nativeOrigins } from "./auth";
import {
  finalizeUploadFromApp,
  finalizeUploadOptions,
  uploadFromApp,
  uploadFromAppOptions,
} from "./media";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth, {
  cors: {
    allowedOrigins: nativeOrigins,
  },
});

/**
 * Health check endpoint
 * GET /api/health
 */
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),
});

http.route({
  path: "/broadcast/auth",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let body: {
      action?: string;
      protocol?: string;
      path?: string;
      user?: string;
      password?: string;
      token?: string;
    };

    try {
      body = await request.json();
    } catch {
      return new Response("invalid auth request", { status: 400 });
    }

    const result: { authorized: boolean } = await ctx.runMutation(
      internal.rooms.validateListenerPublish,
      {
        action: body.action ?? "",
        protocol: body.protocol ?? "",
        path: body.path ?? "",
        user: body.user,
        password: body.password,
        token: body.token,
      }
    );

    return new Response(result.authorized ? "ok" : "unauthorized", {
      status: result.authorized ? 200 : 401,
    });
  }),
});

http.route({
  path: "/media/upload",
  method: "OPTIONS",
  handler: uploadFromAppOptions,
});

http.route({
  path: "/media/upload",
  method: "POST",
  handler: uploadFromApp,
});

http.route({
  path: "/media/finalize",
  method: "OPTIONS",
  handler: finalizeUploadOptions,
});

http.route({
  path: "/media/finalize",
  method: "POST",
  handler: finalizeUploadFromApp,
});

export default http;

