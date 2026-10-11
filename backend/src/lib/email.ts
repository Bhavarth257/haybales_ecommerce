import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';

const ses = new SESv2Client({});
const FROM = process.env.SUPPORT_EMAIL ?? '';

/** Best effort: SES sandbox rejects unverified recipients; log and carry on. */
export async function sendEmail(to: string | string[], subject: string, text: string, replyTo?: string) {
  if (!FROM) return console.warn('SUPPORT_EMAIL not set; skipping email');
  try {
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: `Parali Setu <${FROM}>`,
        Destination: { ToAddresses: ([] as string[]).concat(to) },
        ReplyToAddresses: replyTo ? [replyTo] : undefined,
        Content: { Simple: { Subject: { Data: subject }, Body: { Text: { Data: text } } } },
      }),
    );
  } catch (e) {
    // Name only: SES rejection messages include the recipient address.
    console.warn('email failed', (e as Error).name);
  }
}
