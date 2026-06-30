// Inngest drives all background work: scheduled feed polling, severity rating,
// and the daily email fan-out (one job per user, with retries + concurrency
// control). Functions are registered with the serve() handler in
// app/api/inngest/route.ts.
import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "stack-digest" });
