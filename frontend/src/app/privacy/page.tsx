import Link from 'next/link';
import { PageHeader } from '../../components/ui';
import { Tx } from '../../lib/i18n';

const TEAM_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
const h2 = 'mt-8 font-display text-2xl';
const a = 'font-semibold text-field underline underline-offset-4';

// Legal text stays in English on purpose; only the title is translated.
export default function Page() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={<Tx k="common.legal.privacyTitle" />} sub={<span lang="en">Last updated 11 Oct 2026</span>} />
      <article lang="en" className="space-y-3 leading-relaxed">
        <p className="rounded-xl border border-straw/40 bg-straw-soft px-4 py-3 text-sm text-[#6b4a0c]">Draft for the hackathon; have a lawyer review before real launch.</p>
        <p>
          Parali Setu is a marketplace where farmers sell crop stubble to biomass plants, mills and other buyers, and transporters carry it. This page says
          what we collect, why, and who can see it.
        </p>

        <h2 className={h2}>What we collect</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Your account: name, email, phone number (optional), role (farmer, buyer or transporter) and organisation name if you add one.</li>
          <li>Your place: village, district and state, and a map point. Public listings show the point rounded to about 1 km, so the exact farm stays hidden.</li>
          <li>What you do on the marketplace: listings, stubble photos, offers, counter offers, orders and delivery status.</li>
          <li>Messages you send through the Help form. They reach our team by email.</li>
          <li>
            AI helper chats. What you type is sent to Amazon Bedrock to write the reply, and Bedrock may process it in an AWS region outside India. We do not
            save the conversation. Text you play with read-aloud goes to Amazon Polly to make the audio.
          </li>
        </ul>

        <h2 className={h2}>Why we use it</h2>
        <p>
          To run your account, let an admin verify you, show listings to buyers, handle offers and orders, arrange pickup, email you when an offer or order
          changes, answer help requests and block abuse such as too many requests from one person.
        </p>

        <h2 className={h2}>Where it is stored</h2>
        <p>On Amazon Web Services in the Mumbai region (ap-south-1): logins in Amazon Cognito, records in DynamoDB and photos in S3.</p>

        <h2 className={h2}>Who can see what</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Anyone can see an approved listing: crop, quantity, price, photos, the farmer&apos;s name, district and the rounded location.</li>
          <li>
            Phone numbers are shared only between the people in an order: the farmer and buyer once an offer is accepted, and the transporter who takes the
            job. Transporters looking at open jobs see districts only, no phone numbers.
          </li>
          <li>Parali Setu admins can see account details to verify users and sort out problems with orders.</li>
        </ul>
        <p>We do not sell your data. We show no ads and use no tracking or analytics.</p>

        <h2 className={h2}>Cookies and browser storage</h2>
        <p>
          Your browser stores two things for this site: your language choice and your login session. The site needs both to work and neither tracks you, so
          there is no cookie banner.
        </p>

        <h2 className={h2}>How long we keep it</h2>
        <p>
          We keep your data while your account is open. If you ask us to delete your account, we remove your profile, listings and photos. We may keep records
          of completed orders, because the other party relies on them and the law may require us to keep them.
        </p>

        <h2 className={h2}>Your rights</h2>
        <p>
          Under India&apos;s Digital Personal Data Protection Act, 2023 you can ask to see the data we hold about you, correct it, or delete it. You can change
          your name, phone, organisation and place yourself on your Profile page. If you have a complaint, write to us first. If our answer does not settle it,
          you can go to the Data Protection Board of India.
        </p>

        <h2 className={h2}>Contact</h2>
        <p>
          {TEAM_EMAIL ? (
            <>
              Email <a href={`mailto:${TEAM_EMAIL}`} className={a}>{TEAM_EMAIL}</a> or write
            </>
          ) : (
            'Write'
          )}{' '}
          to us through the <Link href="/help/" className={a}>Help page</Link>.
        </p>
      </article>
    </div>
  );
}
