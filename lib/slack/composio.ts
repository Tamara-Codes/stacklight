// Composio powers the "instant Slack alerts on reds" feature. Composio
// owns the Slack OAuth dance and token storage; we keep only (connected
// account id, channel) per user in alert_channels (kind='slack'). Server/background only —
// COMPOSIO_API_KEY must never reach the browser.
//
// Lazy singleton: `next build` evaluates route modules while collecting page
// data, and a module-level client would make every build require
// COMPOSIO_API_KEY. Constructing on first use keeps it a runtime concern.
import { Composio } from "@composio/core";

let client: Composio | null = null;
function getComposio(): Composio {
  client ??= new Composio({ apiKey: process.env.COMPOSIO_API_KEY! });
  return client;
}

// The Slack auth config created once in the Composio dashboard (ac_...).
// One config serves every user; Composio keys connections by our user id.
function slackAuthConfigId(): string {
  return process.env.COMPOSIO_SLACK_AUTH_CONFIG_ID!;
}

// Start the OAuth flow: the returned URL is Slack's consent screen. Composio
// sends the user back to callbackUrl with ?status=success|failed. (`link`,
// not the retired `initiate` — Composio-managed OAuth cut over on 2026-07-03.)
export async function createSlackConnectLink(userId: string, callbackUrl: string): Promise<string> {
  const { redirectUrl } = await getComposio().connectedAccounts.link(
    userId,
    slackAuthConfigId(),
    { callbackUrl }
  );
  if (!redirectUrl) throw new Error("Composio returned no redirect URL for Slack connect");
  return redirectUrl;
}

// The user's ACTIVE Slack connection in Composio, if any. Composio is the
// source of truth — our alert_channels(slack) row is a cache of this.
export async function getActiveSlackAccountId(userId: string): Promise<string | null> {
  const { items } = await getComposio().connectedAccounts.list({
    userIds: [userId],
    authConfigIds: [slackAuthConfigId()],
    statuses: ["ACTIVE"],
  });
  return items[0]?.id ?? null;
}

// Revokes the workspace tokens Composio holds for this connection.
export async function deleteSlackAccount(connectedAccountId: string): Promise<void> {
  await getComposio().connectedAccounts.delete(connectedAccountId);
}

// Post one message to the user's connected workspace. `channel` is a name
// without '#' (SLACK_SEND_MESSAGE also accepts a channel id).
export async function sendSlackMessage(userId: string, channel: string, markdown: string): Promise<void> {
  const result = await getComposio().tools.execute("SLACK_SEND_MESSAGE", {
    userId,
    arguments: { channel, markdown_text: markdown },
  });
  if (!result.successful) {
    throw new Error(`Slack send failed: ${result.error ?? "unknown error"}`);
  }
}
