// Discord red alerts, the simple way: the user pastes an Incoming Webhook URL
// (Server Settings → Integrations → Webhooks) and we POST to it. No OAuth, no
// bot install, no Composio, no env key — the webhook URL IS the credential and
// it lives per-user in alert_channels. Server/background only.

// A Discord incoming webhook: https://discord.com/api/webhooks/<id>/<token>
// (discordapp.com is the legacy host Discord still serves). Validated on save
// so we never store a URL we can't post to.
const WEBHOOK_RE =
  /^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;

export function isDiscordWebhookUrl(url: string): boolean {
  return WEBHOOK_RE.test(url.trim());
}

// Post one message to the webhook's channel. `content` is Discord-flavoured
// markdown (**bold**, [text](url) is NOT linkified in content — Discord shows
// the raw URL, which is fine for us). Throws on any non-2xx so the Inngest step
// retries.
export async function sendDiscordMessage(webhookUrl: string, content: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Discord send failed: ${res.status} ${body.slice(0, 200)}`);
  }
}
