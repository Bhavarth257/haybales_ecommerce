import Link from 'next/link';
import { PageHeader } from '../../components/ui';
import { Tx } from '../../lib/i18n';

const TEAM_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
const h2 = 'mt-8 font-display text-2xl';
const a = 'font-semibold text-field underline underline-offset-4';

// Legal text stays in English on purpose; only the title is translated.
export default function Page() {
  const mail = TEAM_EMAIL ? <a href={`mailto:${TEAM_EMAIL}`} className={a}>{TEAM_EMAIL}</a> : null;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={<Tx k="common.legal.contactTitle" />} sub={<span lang="en">Last updated 11 Oct 2026</span>} />
      <article lang="en" className="space-y-3 leading-relaxed">
        <p className="rounded-xl border border-straw/40 bg-straw-soft px-4 py-3 text-sm text-[#6b4a0c]">Draft for the hackathon; have a lawyer review before real launch.</p>

        <h2 className={h2}>Write to us</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Signed in: use the <Link href="/help/" className={a}>Help page</Link>. Your message reaches the team with your account attached, in any language.</li>
          {mail && <li>Email: {mail}</li>}
        </ul>
        <p>Include your order number if the question is about an order.</p>

        <h2 className={h2}>Grievance Officer</h2>
        <p>
          For complaints about the service or about your personal data, under the IT Rules, 2021 and the Digital Personal Data Protection Act, 2023:
        </p>
        <dl className="space-y-2 rounded-xl border border-line bg-surface px-4 py-3">
          <div><dt className="inline font-semibold">Name: </dt><dd className="inline">Parali Setu Team</dd></div>
          {mail && <div><dt className="inline font-semibold">Email: </dt><dd className="inline">{mail}</dd></div>}
          <div><dt className="inline font-semibold">Postal address: </dt><dd className="inline">provided on request (we have no registered office yet)</dd></div>
        </dl>
        <p>We acknowledge a complaint within 72 hours and resolve it within 30 days.</p>
        <p>
          If our answer does not settle a data complaint, you can go to the Data Protection Board of India. See the{' '}
          <Link href="/privacy/" className={a}>Privacy policy</Link> for your rights.
        </p>
      </article>
    </div>
  );
}
