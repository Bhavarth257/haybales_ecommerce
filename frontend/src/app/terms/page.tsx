import Link from 'next/link';
import { PageHeader } from '../../components/ui';
import { Tx } from '../../lib/i18n';

const h2 = 'mt-8 font-display text-2xl';
const a = 'font-semibold text-field underline underline-offset-4';

// Legal text stays in English on purpose; only the title is translated.
export default function Page() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={<Tx k="common.legal.termsTitle" />} sub={<span lang="en">Last updated 11 Oct 2026</span>} />
      <article lang="en" className="space-y-3 leading-relaxed">
        <p className="rounded-xl border border-straw/40 bg-straw-soft px-4 py-3 text-sm text-[#6b4a0c]">Draft for the hackathon; have a lawyer review before real launch.</p>
        <p>
          By creating an account or using Parali Setu you agree to these terms. Our <Link href="/privacy/" className={a}>Privacy policy</Link> explains what we
          do with your data.
        </p>

        <h2 className={h2}>Who can use it</h2>
        <p>
          You must be 18 or older and able to make a binding contract under Indian law. At signup you give your date of birth and confirm you are 18 or older.
          For someone younger, a parent or guardian can write to us, and the team decides whether to set up an account after checking the guardian&apos;s consent.
          If we find an account belongs to someone under 18 without that consent, we close it.
        </p>

        <h2 className={h2}>What Parali Setu is</h2>
        <p>
          Parali Setu is a marketplace. It helps farmers, buyers and transporters find each other and agree a deal. We are not the seller or the buyer of any
          stubble, and we do not own or carry it.
        </p>

        <h2 className={h2}>How prices are set</h2>
        <p>
          The farmer sets an asking price per tonne. A buyer sends an offer, and the farmer can accept it, reject it or send back one counter price. When an
          offer is made, the app fixes the transport cost for that trip. The delivered price the buyer pays is the stubble price plus that transport cost, and
          it does not change after the offer is accepted.
        </p>
        <p>
          The price band the app shows is guidance from recent prices and distance. It is not a guarantee that anyone will buy or sell at that price, and you
          are free to agree a different one.
        </p>

        <h2 className={h2}>What each person agrees to do</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Farmers: list only stubble you have and are free to sell, describe the crop, quantity and condition honestly, and have it ready at pickup.</li>
          <li>Buyers: make offers you mean to honour, accept delivery at the address you gave, and pay once the stubble is delivered.</li>
          <li>Transporters: take only jobs you can do, pick up and deliver on time, handle the load with care and follow road and safety laws.</li>
          <li>Everyone: keep your account details correct and your password private.</li>
        </ul>

        <h2 className={h2}>Payments</h2>
        <p>
          During the hackathon demo, payments are simulated and no real money moves. Later, payments will go through a licensed payment gateway, and its own
          terms will apply too.
        </p>

        <h2 className={h2}>Cancelling an order</h2>
        <p>
          The farmer or the buyer can cancel an order until a transporter takes the job. The tonnes then go back on the listing. After pickup is arranged,
          write to us through the <Link href="/help/" className={a}>Help page</Link> and we will try to sort it out with everyone involved. See{' '}
          <Link href="/refund/" className={a}>Refund and cancellation</Link> and <Link href="/shipping/" className={a}>Shipping and delivery</Link>.
        </p>

        <h2 className={h2}>Closing your account</h2>
        <p>
          You can delete your account from the Profile page once none of your orders is in progress. The <Link href="/privacy/" className={a}>Privacy policy</Link>{' '}
          says what is removed and what is kept.
        </p>

        <h2 className={h2}>What admins can do</h2>
        <p>
          Our admins check listings and accounts before they go live. They can reject or remove a listing, refuse to verify an account, or close an account that
          breaks these terms.
        </p>

        <h2 className={h2}>Acceptable use</h2>
        <p>Use Parali Setu only to buy, sell and carry crop stubble honestly. You must not:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Post fake listings or offers, or pretend to be someone else.</li>
          <li>Scrape the site or copy other users&apos; details, such as phone numbers, for any use outside an order.</li>
          <li>Try to break into accounts, overload the service or get around its limits.</li>
          <li>Arrange a deal through Parali Setu and then pressure the other side to drop the agreed terms.</li>
          <li>Upload photos or text that are abusive, misleading or not yours to share.</li>
          <li>Use the marketplace for anything illegal.</li>
        </ul>

        <h2 className={h2}>Limits of our responsibility</h2>
        <p>
          We do not check every load, so we cannot promise the quality or quantity of any stubble, or that a buyer or transporter will do what they agreed. The
          service is offered as it is, and it may be down at times. As far as Indian law allows, we are not liable for losses from deals between users. The AI
          helper can be wrong, so check anything important with a person.
        </p>

        <h2 className={h2}>Law</h2>
        <p>These terms are governed by the laws of India. Disputes go to the courts of India.</p>
      </article>
    </div>
  );
}
