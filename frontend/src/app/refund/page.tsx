import Link from 'next/link';
import { PageHeader } from '../../components/ui';
import { Tx } from '../../lib/i18n';

const h2 = 'mt-8 font-display text-2xl';
const a = 'font-semibold text-field underline underline-offset-4';

// Legal text stays in English on purpose; only the title is translated.
export default function Page() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={<Tx k="common.legal.refundTitle" />} sub={<span lang="en">Last updated 11 Oct 2026</span>} />
      <article lang="en" className="space-y-3 leading-relaxed">
        <p className="rounded-xl border border-straw/40 bg-straw-soft px-4 py-3 text-sm text-[#6b4a0c]">Draft for the hackathon; have a lawyer review before real launch.</p>
        <p>
          Parali Setu is a marketplace. The farmer sells the stubble, the buyer pays for it and a transporter carries it. We are not the seller, so a refund is
          between the buyer and the farmer, and we help sort it out.
        </p>

        <h2 className={h2}>Payments today</h2>
        <p>
          During the hackathon demo, payments are simulated and no real money moves, so there is nothing to refund yet. When real payments start, they will go
          through a licensed payment gateway (Razorpay), and refunds will go back to the account or card that paid.
        </p>

        <h2 className={h2}>Cancelling an order</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>The farmer or the buyer can cancel an order in the app until a transporter takes the job. Nothing has been paid at that point, and the tonnes go back on the listing.</li>
          <li>Once a transporter has taken the job, the app no longer lets you cancel. Write to us through the <Link href="/help/" className={a}>Help page</Link> and we will work it out with the farmer, buyer and transporter.</li>
          <li>A buyer can withdraw an offer, and a farmer can reject one, any time before it is accepted.</li>
        </ul>

        <h2 className={h2}>When a refund applies</h2>
        <p>The buyer pays only after delivery. Once real payments start, a buyer can ask for a full or part refund within 7 days of delivery if:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>fewer tonnes arrived than the order says (refund for the missing tonnes);</li>
          <li>the stubble is clearly not what the listing described, for example the wrong crop or soaked through;</li>
          <li>the buyer was charged twice or charged the wrong amount.</li>
        </ul>
        <p>
          Send the order number, what went wrong and photos if you have them. We ask the farmer and the transporter for their side, and decide within 30 days.
          The listed price band is guidance only, so a price you agreed to is not a reason for a refund.
        </p>

        <h2 className={h2}>Transport charges</h2>
        <p>
          If the trip happened, the transport cost is usually not refunded. If the transporter did not turn up or the load was lost on the way, the transport
          cost is refunded along with the stubble price.
        </p>

        <h2 className={h2}>Questions</h2>
        <p>
          See <Link href="/shipping/" className={a}>Shipping and delivery</Link> for who is responsible for the load at each step, or{' '}
          <Link href="/contact/" className={a}>contact us</Link>.
        </p>
      </article>
    </div>
  );
}
