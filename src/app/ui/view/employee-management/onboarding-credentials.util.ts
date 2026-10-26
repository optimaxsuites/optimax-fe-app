/** How long an onboarding link stays valid, in working days (Mon–Fri). The expired page quotes this. */
export const ONBOARDING_LINK_VALID_WORKING_DAYS = 5;

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%*?';

/** A uniformly random integer in [0, max), from the browser's cryptographic RNG. */
function secureRandomInt(max: number): number {
  // Reject values past the last whole multiple of `max` so every result is equally likely.
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % max;
}

/** A temporary password with at least one lowercase letter, uppercase letter, digit and symbol. */
export function generateTemporaryPassword(length = 12): string {
  const all = LOWERCASE + UPPERCASE + DIGITS + SYMBOLS;
  const pick = (chars: string) => chars[secureRandomInt(chars.length)];
  const chars = [pick(LOWERCASE), pick(UPPERCASE), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < length) {
    chars.push(pick(all));
  }
  // Fisher–Yates, so the guaranteed characters aren't always at the front.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/** Escapes text for use inside HTML element content or a quoted attribute. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** The end of the onboarding window: `workingDays` weekdays after `from`, at the same time of day. */
export function onboardingLinkExpiry(from: Date = new Date(), workingDays = ONBOARDING_LINK_VALID_WORKING_DAYS): Date {
  const expiry = new Date(from);
  let remaining = workingDays;
  while (remaining > 0) {
    expiry.setDate(expiry.getDate() + 1);
    const day = expiry.getDay();
    if (day !== 0 && day !== 6) {
      remaining--;
    }
  }
  return expiry;
}

/**
 * The self-onboarding link emailed to a new employee. `exp` (ms since epoch) is read by
 * AddEmployeeFormComponent, which shows the "link expired" page once it has passed.
 */
export function buildOnboardingLink(employeeId: number | string, expiresAt: Date, origin: string = window.location.origin): string {
  return `${origin}/onboarding/${encodeURIComponent(String(employeeId))}/wer23456fghi367ghj?onboarding=1&exp=${expiresAt.getTime()}`;
}

export interface OnboardingEmailDetails {
  name: string;
  username: string;
  password: string;
  url: string;
  companyName: string;
  hrEmail: string;
  /** When the link in `url` expires; shown in the email. */
  expiresAt: Date;
}

/** The onboarding email with login credentials. Every value is escaped, so names can't inject markup. */
export function buildOnboardingEmailHtml(details: OnboardingEmailDetails): string {
  const name = escapeHtml(details.name);
  const username = escapeHtml(details.username);
  const password = escapeHtml(details.password);
  const url = escapeHtml(details.url);
  const companyName = escapeHtml(details.companyName);
  const hrEmail = escapeHtml(details.hrEmail);
  const expiryDate = escapeHtml(
    details.expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  );

  const hrLine = hrEmail
    ? `Please contact the <strong>HR Department</strong> at <a href="mailto:${hrEmail}" style="color:#1e3a5f;text-decoration:none;">${hrEmail}</a> for any queries regarding your onboarding.`
    : `Please contact the <strong>HR Department</strong> for any queries regarding your onboarding.`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:36px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
      <tr>
        <td style="background:#1b3358;padding:36px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;color:#7aa7d4;text-transform:uppercase;">Human Resources</p>
          <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">${companyName}</h1>
          <p style="margin:8px 0 0;font-size:13px;color:#a8c5e8;">Staff Onboarding</p>
        </td>
      </tr>
      <tr>
        <td style="padding:40px 40px 28px;">
          <p style="margin:0 0 20px;font-size:15px;color:#1a2b3c;font-weight:600;">Dear ${name},</p>
          <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.7;">
            We are delighted to welcome you to <strong>${companyName}</strong>. Please complete your onboarding by submitting the required documentation through the portal below.
          </p>
          <p style="margin:0 0 8px;font-size:13px;color:#64748b;">You will be required to provide:</p>
          <ul style="margin:0 0 24px;padding-left:20px;font-size:13px;color:#64748b;line-height:2;">
            <li>Passport photograph / Valid ID</li>
            <li>Guarantor information</li>
            <li>Next-of-kin details</li>
            <li>Bank account number</li>
            <li>Any other requested personal information</li>
          </ul>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
            <tr>
              <td style="background:#1b3358;border-radius:6px;padding:13px 30px;">
                <a href="${url}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.3px;">Begin Onboarding Process →</a>
              </td>
            </tr>
          </table>
          <p style="margin:0 0 28px;font-size:12px;color:#94a3b8;">This link expires on <strong>${expiryDate}</strong>. After that, ask HR to send you a new one.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
            <tr>
              <td style="padding:22px 26px;">
                <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Your Portal Credentials</p>
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:5px 16px 5px 0;font-size:13px;color:#94a3b8;white-space:nowrap;">Username</td>
                    <td style="padding:5px 0;font-size:13px;color:#1e293b;font-weight:600;">${username}</td>
                  </tr>
                  <tr>
                    <td style="padding:5px 16px 5px 0;font-size:13px;color:#94a3b8;white-space:nowrap;">Temporary password</td>
                    <td style="padding:5px 0;font-size:13px;color:#1e293b;font-family:monospace;font-weight:700;letter-spacing:1.5px;background:#f1f5f9;border-radius:4px;padding-left:8px;padding-right:8px;">${password}</td>
                  </tr>
                </table>
                <p style="margin:14px 0 0;font-size:11px;color:#94a3b8;">Please change this password from your profile as soon as you sign in, and delete this email afterwards.</p>
              </td>
            </tr>
          </table>
          <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">If the button above does not work, copy and paste the link below into your browser:</p>
          <p style="margin:0;font-size:12px;color:#3b82f6;word-break:break-all;">${url}</p>
        </td>
      </tr>
      <tr>
        <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;">
          <p style="margin:0 0 10px;font-size:13px;color:#475569;line-height:1.6;">${hrLine}</p>
          <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">
            We look forward to a productive and rewarding journey together.<br/>
            <strong>Human Resources Department</strong><br/>
            ${companyName}
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 40px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#cbd5e1;">This is a system-generated message. Please do not reply to this email.</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}
