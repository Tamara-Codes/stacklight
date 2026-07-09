// Inngest's entry point. Vercel hosts this route; Inngest calls it to run our
// scheduled/queued functions. Register every Inngest function here.
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { ingestFeeds } from "@/lib/inngest/functions/ingest";
import { pollStatusFeeds } from "@/lib/inngest/functions/poll-status";
import { dispatchDigests, sendUserDigest } from "@/lib/inngest/functions/digest";
import { dispatchRedAlert, sendUserRedAlert } from "@/lib/inngest/functions/alerts";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [ingestFeeds, pollStatusFeeds, dispatchDigests, sendUserDigest, dispatchRedAlert, sendUserRedAlert],
});
