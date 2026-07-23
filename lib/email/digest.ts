// Builds the daily digest email. Pure function: takes a user's rated entries and
// returns { subject, html }. Table-based layout + inline styles only — email
// clients (Outlook especially) ignore <style> blocks, flex/grid, and @font-face.
//
// Design: a dark terminal window. The macOS titlebar dots double as the
// traffic light; below them a composed plain-English lead sentence answers
// "do I need to care today?" before anything else; entries follow as log
// rows sorted red → yellow → green. Severity markers are text glyphs (●),
// not border-radius'd elements — Outlook's Word engine renders those as
// squares, but a glyph is a circle everywhere.
import type { Severity } from "@/lib/ai/severity";

export interface DigestEntry {
  severity: Severity;
  vendor: string;
  title: string;
  url: string | null;
  why: string;
}

const MONO = `ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Roboto Mono','Courier New',monospace`;

const SIGNAL: Record<Severity, string> = {
  red: "#E5483C",
  yellow: "#E2A93B",
  green: "#3DA867",
};

const PAPER = "#E9EBEE"; // page behind the window
const CARD = "#12161C"; // window body
const TITLEBAR = "#1A2029";
const FRAME = "#262D38"; // window border + footer rule
const HAIRLINE = "#1E242D"; // between log rows
const TEXT = "#EDF1F6"; // red/yellow titles
const DIM = "#C7CFDA"; // green titles (quieter)
const MUTED = "#7D8794"; // vendor names, "why" lines
const FAINT = "#5C6673"; // footer

const ORDER: Record<Severity, number> = { red: 0, yellow: 1, green: 2 };

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

// Collapse re-posted/edited status updates (same vendor + same headline,
// different external_id) into one line. Callers already order most-recent
// first, so keeping the first occurrence keeps the latest revision.
function dedupe(entries: DigestEntry[]): DigestEntry[] {
  const seen = new Set<string>();
  const out: DigestEntry[] = [];
  for (const e of entries) {
    const key = `${e.vendor.trim().toLowerCase()}|${e.title.trim().toLowerCase().replace(/\s+/g, " ")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

const NUM_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six",
  "seven", "eight", "nine", "ten", "eleven", "twelve",
];
function numWord(n: number): string {
  return n < NUM_WORDS.length ? NUM_WORDS[n] : String(n);
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// "Supabase", "Supabase and Anthropic", "A, B and C", "A, B and 3 more".
function vendorPhrase(names: string[]): { text: string; plural: boolean } {
  const unique = [...new Set(names)];
  const shown = unique.slice(0, 3);
  const rest = unique.length - shown.length;
  let text: string;
  if (rest > 0) {
    text = `${shown.join(", ")} and ${rest} more`;
  } else if (shown.length === 1) {
    text = shown[0];
  } else {
    text = `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
  }
  return { text, plural: unique.length > 1 };
}

// The lead: one composed sentence (or two) that answers "do I need to care?"
// Pure string templates — no AI call, so the per-user cost model is unchanged.
// Returns HTML; vendor names are escaped, everything else is our own copy.
function buildLead(entries: DigestEntry[], counts: Record<Severity, number>): string {
  const span = (sev: Severity, text: string) => `<span style="color:${SIGNAL[sev]};">${text}</span>`;
  const { red, yellow, green } = counts;

  if (red > 0) {
    const vendors = vendorPhrase(entries.filter((e) => e.severity === "red").map((e) => e.vendor));
    const first = `${span("red", `${capitalize(numWord(red))} red${red > 1 ? "s" : ""} need${red === 1 ? "s" : ""} your attention`)} — ${escape(vendors.text)} ${vendors.plural ? "are" : "is"} having trouble.`;
    const parts: string[] = [];
    if (yellow > 0) parts.push(`${numWord(yellow)} heads-up${yellow > 1 ? "s" : ""}`);
    if (green > 0) parts.push(`${numWord(green)} ship${green > 1 ? "s" : ""}`);
    const second = parts.length
      ? `${capitalize(parts.join(" and "))} below — the rest of your stack is quiet.`
      : "Nothing else moved today.";
    return `${first} ${second}`;
  }

  if (yellow > 0) {
    const first = `${span("yellow", `${capitalize(numWord(yellow))} heads-up${yellow > 1 ? "s" : ""} worth a look`)} — nothing in your stack is on fire.`;
    const second = green > 0 ? `${capitalize(numWord(green))} ship${green > 1 ? "s" : ""} below.` : "";
    return second ? `${first} ${second}` : first;
  }

  return `${span("green", `${capitalize(numWord(green))} new thing${green > 1 ? "s" : ""} shipped`)} — nothing needs your attention today.`;
}

// One log row: ● severity dot, lowercase vendor, title + "why" line.
function logRow(e: DigestEntry, isLast: boolean): string {
  const slug = e.vendor.trim().toLowerCase().replace(/\s+/g, "-");
  const titleColor = e.severity === "green" ? DIM : TEXT;
  const title = e.url
    ? `<a href="${e.url}" style="color:${titleColor};text-decoration:none;">${escape(e.title)}</a>`
    : escape(e.title);
  return `
      <tr><td style="padding:12px 0 10px;${isLast ? "" : `border-bottom:1px solid ${HAIRLINE};`}">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td width="24" valign="top" style="font-family:${MONO};font-size:13px;color:${SIGNAL[e.severity]};line-height:1.45;">&#9679;</td>
          <td width="92" valign="top" style="font-family:${MONO};font-size:12px;color:${MUTED};line-height:1.6;white-space:nowrap;padding-right:10px;">${escape(slug)}</td>
          <td valign="top">
            <div style="font-family:${MONO};font-size:13px;color:${titleColor};line-height:1.45;">${title}</div>
            <div style="font-family:${MONO};font-size:12px;color:${MUTED};line-height:1.5;margin-top:3px;">&#8627; ${escape(truncate(e.why, 110))}</div>
          </td>
        </tr></table>
      </td></tr>`;
}

export function buildDigestEmail(input: {
  entries: DigestEntry[];
  manageUrl: string;
  unsubscribeUrl: string;
  date?: string;
}): { subject: string; html: string } {
  const entries = dedupe(input.entries).sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  const counts = { red: 0, yellow: 0, green: 0 } as Record<Severity, number>;
  for (const e of entries) counts[e.severity]++;

  const subject = counts.red
    ? `Stacklight — ${counts.red} red alert${counts.red > 1 ? "s" : ""} today`
    : `Stacklight — ${entries.length} update${entries.length === 1 ? "" : "s"} in your stack`;

  const lead = buildLead(entries, counts);

  // Titlebar dots: spans with border-radius look right in Gmail/Apple Mail;
  // Outlook degrades them to small squares, which still reads as a titlebar.
  const titlebarDots = (["red", "yellow", "green"] as Severity[])
    .map((s) => `<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:${SIGNAL[s]};font-size:0;">&nbsp;</span>`)
    .join("&nbsp;");

  const html = `
  <div style="background:${PAPER};padding:36px 16px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background:${CARD};border-radius:10px;overflow:hidden;border:1px solid ${FRAME};">

    <tr><td style="background:${TITLEBAR};padding:11px 16px;border-bottom:1px solid ${FRAME};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="white-space:nowrap;">${titlebarDots}</td>
        <td align="center" style="font-family:${MONO};font-size:11px;color:${MUTED};">stacklight &mdash; daily digest</td>
        <td align="right" style="font-family:${MONO};font-size:11px;color:${MUTED};white-space:nowrap;">${escape(input.date ?? "")}</td>
      </tr></table>
    </td></tr>

    <tr><td style="padding:22px 22px 6px;">
      <div style="font-family:${MONO};font-size:12px;color:${MUTED};">$ stacklight --today</div>
      <div style="font-family:${MONO};font-size:19px;font-weight:bold;color:${TEXT};line-height:1.5;margin-top:12px;">${lead}</div>
    </td></tr>

    <tr><td style="padding:12px 22px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        ${entries.map((e, i) => logRow(e, i === entries.length - 1)).join("")}
      </table>
    </td></tr>

    <tr><td style="padding:14px 22px 20px;border-top:1px solid ${FRAME};">
      <div style="font-family:${MONO};font-size:11px;color:${FAINT};">
        <a href="${input.manageUrl}" style="color:${MUTED};">manage tools</a> &nbsp;&middot;&nbsp; <a href="${input.unsubscribeUrl}" style="color:${MUTED};">unsubscribe</a>
      </div>
      <div style="font-family:${MONO};font-size:11px;color:#454E5A;margin-top:6px;"># stacklight watches your stack so you don&rsquo;t have to</div>
    </td></tr>

  </table>
  </div>`;

  return { subject, html };
}

// The instant red alert email: one red, sent the moment it lands (not the
// daily digest — that still goes out separately). Same terminal-window shell as
// buildDigestEmail so the two read as one product; the titlebar light is a
// single lit red dot and the lead is the one incident.
export function buildRedAlertEmail(input: {
  vendor: string;
  title: string;
  url: string | null;
  why: string | null;
  manageUrl: string;
  unsubscribeUrl: string;
}): { subject: string; html: string } {
  const { vendor, title, url, why } = input;
  const subject = `🔴 ${vendor} — ${truncate(title, 80)}`;

  // One lit red dot + two dark ones: the titlebar reads as a red light.
  const titlebarDots = [SIGNAL.red, FRAME, FRAME]
    .map((c) => `<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:${c};font-size:0;">&nbsp;</span>`)
    .join("&nbsp;");

  const headline = url
    ? `<a href="${url}" style="color:${TEXT};text-decoration:none;">${escape(title)}</a>`
    : escape(title);

  const html = `
  <div style="background:${PAPER};padding:36px 16px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background:${CARD};border-radius:10px;overflow:hidden;border:1px solid ${FRAME};">

    <tr><td style="background:${TITLEBAR};padding:11px 16px;border-bottom:1px solid ${FRAME};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="white-space:nowrap;">${titlebarDots}</td>
        <td align="center" style="font-family:${MONO};font-size:11px;color:${MUTED};">stacklight &mdash; red alert</td>
        <td align="right" style="font-family:${MONO};font-size:11px;color:${MUTED};white-space:nowrap;"></td>
      </tr></table>
    </td></tr>

    <tr><td style="padding:22px 22px 6px;">
      <div style="font-family:${MONO};font-size:12px;color:${MUTED};">$ stacklight --watch ${escape(vendor.toLowerCase())}</div>
      <div style="font-family:${MONO};font-size:19px;font-weight:bold;color:${TEXT};line-height:1.5;margin-top:12px;">
        <span style="color:${SIGNAL.red};">${escape(vendor)}</span> is having trouble &mdash; worth a look now.
      </div>
    </td></tr>

    <tr><td style="padding:12px 22px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td width="24" valign="top" style="font-family:${MONO};font-size:13px;color:${SIGNAL.red};line-height:1.45;">&#9679;</td>
        <td valign="top">
          <div style="font-family:${MONO};font-size:13px;color:${TEXT};line-height:1.45;">${headline}</div>
          ${why ? `<div style="font-family:${MONO};font-size:12px;color:${MUTED};line-height:1.5;margin-top:3px;">&#8627; ${escape(truncate(why, 160))}</div>` : ""}
        </td>
      </tr></table>
    </td></tr>

    <tr><td style="padding:14px 22px 20px;border-top:1px solid ${FRAME};">
      <div style="font-family:${MONO};font-size:11px;color:${FAINT};">
        <a href="${input.manageUrl}" style="color:${MUTED};">manage tools</a> &nbsp;&middot;&nbsp; <a href="${input.unsubscribeUrl}" style="color:${MUTED};">unsubscribe</a>
      </div>
      <div style="font-family:${MONO};font-size:11px;color:#454E5A;margin-top:6px;"># you still get your daily digest &mdash; this is a red we didn&rsquo;t want you to miss</div>
    </td></tr>

  </table>
  </div>`;

  return { subject, html };
}

// The welcome email, sent the moment someone subscribes. Same terminal-window
// shell as the digest so the product reads as one thing from the first email.
// Confirms what they signed up for and carries the manage link — the only way
// back in, since there's no login.
export function buildWelcomeEmail(input: {
  manageUrl: string;
  unsubscribeUrl: string;
  toolCount: number;
}): { subject: string; html: string } {
  const { manageUrl, unsubscribeUrl, toolCount } = input;
  const subject = "Stacklight — you're in";

  const titlebarDots = (["red", "yellow", "green"] as Severity[])
    .map((s) => `<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:${SIGNAL[s]};font-size:0;">&nbsp;</span>`)
    .join("&nbsp;");

  const tools = `${numWord(toolCount)} tool${toolCount === 1 ? "" : "s"}`;

  const html = `
  <div style="background:${PAPER};padding:36px 16px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background:${CARD};border-radius:10px;overflow:hidden;border:1px solid ${FRAME};">

    <tr><td style="background:${TITLEBAR};padding:11px 16px;border-bottom:1px solid ${FRAME};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="white-space:nowrap;">${titlebarDots}</td>
        <td align="center" style="font-family:${MONO};font-size:11px;color:${MUTED};">stacklight &mdash; welcome</td>
        <td align="right" style="font-family:${MONO};font-size:11px;color:${MUTED};white-space:nowrap;"></td>
      </tr></table>
    </td></tr>

    <tr><td style="padding:22px 22px 6px;">
      <div style="font-family:${MONO};font-size:12px;color:${MUTED};">$ stacklight --subscribe</div>
      <div style="font-family:${MONO};font-size:19px;font-weight:bold;color:${TEXT};line-height:1.5;margin-top:12px;">
        You&rsquo;re watching ${escape(tools)}. We&rsquo;ll do the reading.
      </div>
    </td></tr>

    <tr><td style="padding:6px 22px 24px;">
      <div style="font-family:${MONO};font-size:13px;color:${DIM};line-height:1.6;">
        Every morning you&rsquo;ll get one email rating what changed &mdash; ${escape("reds first")}, then heads-ups, then quiet ships. Turn on instant alerts (email, Slack, or Discord) whenever you like.
      </div>
    </td></tr>

    <tr><td style="padding:14px 22px 20px;border-top:1px solid ${FRAME};">
      <div style="font-family:${MONO};font-size:11px;color:${FAINT};">
        <a href="${manageUrl}" style="color:${MUTED};">manage your stack &amp; alerts</a> &nbsp;&middot;&nbsp; <a href="${unsubscribeUrl}" style="color:${MUTED};">unsubscribe</a>
      </div>
      <div style="font-family:${MONO};font-size:11px;color:#454E5A;margin-top:6px;"># keep this email &mdash; the manage link is how you get back in</div>
    </td></tr>

  </table>
  </div>`;

  return { subject, html };
}

function escape(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}
