// Inngest's entry point. Vercel hosts this route; Inngest calls it to run our
// scheduled/queued functions. Register every Inngest function here.
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { ingestFeeds } from "@/lib/inngest/functions/ingest";
import { dispatchDigests, sendUserDigest } from "@/lib/inngest/functions/digest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [ingestFeeds, dispatchDigests, sendUserDigest],
});
