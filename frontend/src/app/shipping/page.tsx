import Link from 'next/link';
import { PageHeader } from '../../components/ui';
import { Tx } from '../../lib/i18n';

const h2 = 'mt-8 font-display text-2xl';
const a = 'font-semibold text-field underline underline-offset-4';

// Legal text stays in English on purpose; only the title is translated.
export default function Page() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={<Tx k="common.legal.shippingTitle" />} sub={<span lang="en">Last updated 11 Oct 2026</span>} />
      <article lang="en" className="space-y-3 leading-relaxed">
        <p className="rounded-xl border border-straw/40 bg-straw-soft px-4 py-3 text-sm text-[#6b4a0c]">Draft for the hackathon; have a lawyer review before real launch.</p>

        <h2 className={h2}>Who carries the stubble</h2>
        <p>
          Independent transporters registered on Parali Setu. When a farmer accepts an offer, the order goes on the job board, and a verified transporter near
          the farm takes it. Parali Setu does not own trucks or carry loads itself.
        </p>

        <h2 className={h2}>What it costs</h2>
        <p>
          The app works out a transport cost per tonne from the road distance between the farm and the buyer when the offer is made. That cost is fixed on the
          offer, and the buyer pays it on top of the stubble price.
        </p>

        <h2 className={h2}>How long it takes</h2>
        <p>Parali Setu has no fixed delivery times yet. As a guide:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>A transporter usually takes an order within 1 to 3 days. In peak harvest weeks it can take longer.</li>
          <li>The farmer and transporter agree a pickup time by phone, usually within 2 days of the job being taken.</li>
          <li>Delivery is usually the same day as pickup or the next day, depending on distance.</li>
        </ul>
        <p>Until a transporter takes the order, the farmer or the buyer can cancel it in the app.</p>

        <h2 className={h2}>Who is responsible for the load</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Until pickup, the stubble is the farmer&apos;s. The farmer has it ready, baled or loose as listed, where the transporter can load it.</li>
          <li>From pickup, when the transporter marks the order picked up, the transporter is responsible for it until delivery, including loss or damage on the road.</li>
          <li>From delivery, when the transporter marks it delivered at the buyer&apos;s address, it is the buyer&apos;s.</li>
        </ul>
        <p>Check the load at each handover. Count bales or note the truck weight, and take a photo if something looks wrong.</p>

        <h2 className={h2}>Problems and disputes</h2>
        <p>
          If the load is short, damaged or late, write to us through the <Link href="/help/" className={a}>Help page</Link> within 7 days of delivery with the
          order number and any photos. We hear from the farmer, buyer and transporter and try to settle it within 30 days. See{' '}
          <Link href="/refund/" className={a}>Refund and cancellation</Link> for what can be refunded.
        </p>
      </article>
    </div>
  );
}
