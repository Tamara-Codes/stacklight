// Node.js < 22 has no global `WebSocket`. supabase-js eagerly constructs a
// realtime client (which we never use) that requires one, so we polyfill it on
// the server. Imported by the admin client only — never the browser or edge
// runtimes, which already provide WebSocket.
import { WebSocket as NodeWebSocket } from "ws";

const g = globalThis as { WebSocket?: unknown };
if (typeof g.WebSocket === "undefined") {
  g.WebSocket = NodeWebSocket;
}
