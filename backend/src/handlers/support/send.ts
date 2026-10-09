import { caller } from '../../lib/auth';
import { sendEmail } from '../../lib/email';
import { handler as wrap, json, parseBody } from '../../lib/response';
import { getUser } from '../../lib/users';
import { supportSchema } from '../../validators';

export const handler = wrap(async (event) => {
  const c = caller(event);
  const { subject, message } = parseBody(event, supportSchema);
  const u = await getUser(c.userId);
  await sendEmail(
    process.env.SUPPORT_EMAIL!,
    `[Help] ${subject}`,
    `From: ${u?.name ?? ''} <${c.email ?? ''}> (${u?.role ?? c.roles.join(',')}, ${u?.phone ?? 'no phone'})\nUser: ${c.userId}\n\n${message}`,
    c.email,
  );
  return json(202, { ok: true });
});
