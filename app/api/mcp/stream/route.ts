import { type NextRequest } from "next/server";
import {
  readServerState,
  isAgentDirty,
  clearAgentDirty,
} from "@/lib/server-store";

export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 800;

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
        } catch {
          // client already disconnected
        }
      };

      send("connected", { ok: true });

      const interval = setInterval(async () => {
        try {
          if (await isAgentDirty()) {
            const state = await readServerState();
            if (state) {
              await clearAgentDirty(); // clear only after successful read
              send("agent-update", state);
            }
          }
        } catch {
          // ignore transient errors, keep polling
        }
      }, POLL_INTERVAL_MS);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
