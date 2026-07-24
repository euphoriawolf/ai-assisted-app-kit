// The app's display name. The scaffold rename replaces "Starter App" with the real name.
const APP_NAME = "Starter App";

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// A branded, table-based HTML layout (works in every email client). Keep transactional email
// (magic link, purchase, job complete) on this; relationship notes use plainLayout below.
function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#F7F8F9;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;color:#15181C">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8F9;padding:40px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <tr><td style="background:#0A0C0F;padding:24px 32px"><span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.5px">${APP_NAME}</span></td></tr>
        <tr><td style="padding:32px">${body}</td></tr>
        <tr><td style="padding:16px 32px 32px;border-top:1px solid #E5E7EA"><p style="margin:0;font-size:12px;color:#969CA5;line-height:1.5">You received this because you have a ${APP_NAME} account.</p></td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#0A0C0F;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${label}</a>`;
}

// Deliberately unbranded: reads like a short note a person typed, not a marketing email.
function plainLayout(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">
  <div style="max-width:540px;margin:0 auto;padding:28px 20px">${bodyHtml}</div>
</body></html>`;
}

// ─── Templates ──────────────────────────────────────────────────────────────

export function magicLinkEmail(link: string): EmailTemplate {
  const subject = `Sign in to ${APP_NAME}`;
  const html = layout(subject, `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700">Sign in to ${APP_NAME}</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#4E555F;line-height:1.6">Click below to sign in. This link expires in 15 minutes.</p>
    ${button(link, "Sign in")}
    <p style="margin:24px 0 0;font-size:12px;color:#969CA5">Or copy this link:<br><a href="${link}" style="color:#4E555F;word-break:break-all">${link}</a></p>`);
  const text = `Sign in to ${APP_NAME}\n\n${link}\n\nThis link expires in 15 minutes.`;
  return { subject, html, text };
}

export function welcomeEmail(name: string | null, dashboardUrl: string): EmailTemplate {
  const who = name ? name.split(" ")[0] : "there";
  const subject = `Welcome to ${APP_NAME}`;
  const html = plainLayout(`
    <p>Hey ${who},</p>
    <p>Thanks for signing up to ${APP_NAME}. Jump in here: <a href="${dashboardUrl}">${dashboardUrl}</a></p>
    <p>If anything's confusing or breaks, just reply to this email.</p>`);
  const text = `Hey ${who},\n\nThanks for signing up to ${APP_NAME}. Jump in: ${dashboardUrl}\n\nReply to this email anytime.`;
  return { subject, html, text };
}

export function purchaseConfirmationEmail(opts: { name: string | null; credits: number; amountCents: number; currency: string }): EmailTemplate {
  const subject = `Your ${APP_NAME} credits are ready`;
  const amount = `${(opts.amountCents / 100).toFixed(2)} ${opts.currency.toUpperCase()}`;
  const html = layout(subject, `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700">Credits added</h2>
    <p style="margin:0 0 8px;font-size:15px;color:#4E555F">We added <strong>${opts.credits}</strong> credits to your account (${amount}). They never expire.</p>`);
  const text = `Credits added: ${opts.credits} credits (${amount}). They never expire.`;
  return { subject, html, text };
}

// ─── Send ─────────────────────────────────────────────────────────────────────

// The from-address MUST match the configured Cloudflare Email Sending sender, or the send fails
// silently. Set EMAIL_FROM to a verified address. replyTo should be a human inbox, not noreply.
export async function sendEmail(
  env: { EMAIL: SendEmail; EMAIL_FROM: string },
  to: string,
  template: EmailTemplate,
  replyTo?: string,
): Promise<void> {
  await env.EMAIL.send({
    from: env.EMAIL_FROM,
    to,
    ...(replyTo ? { replyTo } : {}),
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}
