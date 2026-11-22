import { serve } from "@hono/node-server";
import { createApp } from "./server.ts";

const root = process.env.WORKSPACE_ROOT ?? "/workspace";
const port = Number(process.env.PORT ?? 8080);
const hostname = process.env.HOST ?? "127.0.0.1";

serve({ fetch: createApp(root).fetch, port, hostname });
