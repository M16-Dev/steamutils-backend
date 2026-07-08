import { createMiddleware } from "@hono/hono/factory";
import type { IdentityEnv, Role } from "@/types/hono.ts";
import { sendMessage } from "@/utils/discordLogger.ts";

export const requireRole = (allowedRoles: Role[]) => {
  return createMiddleware<IdentityEnv>(async (c, next) => {
    const userRole = c.get("userRole");

    if (!userRole) {
      return c.json({ error: "Role not found" }, 401);
    }

    if (!allowedRoles.includes(userRole)) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }

    c.set("permissionsChecked", true);
    return await next();
  });
};

export const denyByDefault = createMiddleware<IdentityEnv>(async (c, next) => {
  await next();
  if (!c.get("permissionsChecked")) {
    console.warn(`[SECURITY] ${c.req.method} ${c.req.path} — missing requireRole(), access denied`);
    sendMessage("error", "Security Alert", `${c.req.method} ${c.req.path} — missing requireRole(), access denied`);
    c.res = new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
});
