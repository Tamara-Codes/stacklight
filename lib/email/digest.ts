// Builds the daily digest email. Pure function: takes a user's rated entries and
// returns { subject, html }. Light theme + inline styles (email clients ignore
// <style> blocks and dark themes inconsistently). Reds first — that's the point.
import type { Severity } from "@/lib/ai/severity";

export interface DigestEntry {
  severity: Severity;
  vendor: string;
  title: string;
  url: string | null;
  why: string;
}

const DOT: Record<Severity, string> = {
  red: "#ef4444",
  yellow: "#f5b301",
  green: "#22c55e",
};

const ORDER: Record<Severity, number> = { red: 0, yellow: 1, green: 2 };

export function buildDigestEmail(input: {
  entries: DigestEntry[];
  manageUrl: string;
  unsubscribeUrl: string;
}): { subject: string; html: string } {
  const entries = [...input.entries].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  const reds = entries.filter((e) => e.severity === "red").length;

  const subject = reds
    ? `Stacklight —${reds} red alert${reds > 1 ? "s" : ""} today`
    : `Stacklight —${entries.length} update${entries.length === 1 ? "" : "s"} in your stack`;

  const rows = entries
    .map(
      (e) => `
      <tr><td style="padding:12px 0;border-bottom:1px solid #eee;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${DOT[e.severity]};margin-right:8px;"></span>
        <strong style="color:#111;">${escape(e.vendor)}</strong>
        <span style="color:#111;"> — ${e.url ? `<a href="${e.url}" style="color:#111;">${escape(e.title)}</a>` : escape(e.title)}</span>
        <div style="color:#555;font-size:14px;margin-top:4px;">${escape(e.why)}</div>
      </td></tr>`
    )
    .join("");

  const html = `
  <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111;">
    <h1 style="font-size:20px;">Your daily digest</h1>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <p style="color:#888;font-size:12px;margin-top:24px;border-top:1px solid #eee;padding-top:16px;">
      <a href="${input.manageUrl}" style="color:#888;">Manage your tools</a> ·
      <a href="${input.unsubscribeUrl}" style="color:#888;">Unsubscribe</a>
    </p>
  </div>`;

  return { subject, html };
}

function escape(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}
