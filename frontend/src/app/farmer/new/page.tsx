'use client';
import { CROPS, FORMS, type Crop, type Listing, type Place, type StubbleForm } from '@parali/shared';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { ChoiceGroup } from '../../../components/farmer/ChoiceGroup';
import { PhotoPicker } from '../../../components/farmer/PhotoPicker';
import { PriceBandBox } from '../../../components/farmer/PriceBandBox';
import { RequireRole } from '../../../components/layout/RequireRole';
import { isCompletePlace, PlaceInput } from '../../../components/listings/PlaceInput';
import { Card, ErrorBox, Field, goToStep, Input, PageHeader, StepButtons, StepProgress, Textarea } from '../../../components/ui';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { PHOTOS_CDN } from '../../../lib/config';
import { Tx, useI18n } from '../../../lib/i18n';

/** Local "YYYY-MM" (toISOString is UTC, which is still last month early on the 1st in India). */
const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
/** Accepts "1,500" or "12.5" typed on phone keyboards. */
const toNum = (s: string) => (s.trim() === '' ? undefined : Number(s.replace(/,/g, '')));

function Step({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <h2 className="mb-4 font-display text-2xl">{title}</h2>
      <div className="space-y-5">{children}</div>
    </Card>
  );
}

const STEPS = 4;

function NewListing() {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const { me } = useAuth();
  const router = useRouter();
  const [crop, setCrop] = useState<Crop>('paddy');
  const [form, setForm] = useState<StubbleForm>('baled');
  const [qty, setQty] = useState('');
  const [harvest, setHarvest] = useState(thisMonth);
  const [moisture, setMoisture] = useState('');
  const [notes, setNotes] = useState('');
  const [place, setPlace] = useState<Partial<Place>>(me?.place ?? {});
  const [price, setPrice] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isCompletePlace(place)) return setError(t('farmer.new.needPlace'));
    setBusy(true);
    setError(null);
    try {
      const l = await api<Listing>('/listings', {
        method: 'POST',
        body: {
          crop,
          form,
          tonnes: toNum(qty),
          pricePerTonne: Math.round(toNum(price) ?? 0),
          harvestDate: harvest,
          moisturePct: toNum(moisture),
          notes: notes.trim() || undefined,
          place,
          photos,
        },
      });
      router.push(`/farmer/listing/?id=${l.listingId}&new=1`);
    } catch (err) {
      setError((err as Error).message || t('common.errors.generic'));
      setBusy(false);
    }
  };

  // Continue validates the current step (browser `required` + location pin), the last step submits.
  const onStepSubmit = (e: FormEvent) => {
    if (step === STEPS - 1) return submit(e);
    e.preventDefault();
    if (step === 1 && !isCompletePlace(place)) return setError(t('farmer.new.needPlace'));
    setError(null);
    goToStep(setStep, step + 1);
  };

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={<Tx k="farmer.new.title" />} sub={step === 0 ? t('farmer.new.sub') : undefined} />
      <form onSubmit={onStepSubmit} className="space-y-4">
        <StepProgress step={step} total={STEPS} />
        {step === 0 && (
        <Step title={<Tx k="farmer.new.stepWhat" />}>
          <ChoiceGroup legend={t('farmer.new.crop')} name="crop" cols={3} value={crop} onChange={setCrop} options={CROPS.map((c) => ({ value: c, label: t(`common.crops.${c}`) }))} />
          <ChoiceGroup legend={t('farmer.new.form')} name="form" value={form} onChange={setForm} options={FORMS.map((f) => ({ value: f, label: t(`common.forms.${f}`) }))} />
          <Field label={t('farmer.new.tonnes')} hint={t('farmer.new.tonnesHint')}>
            {(p) => <Input {...p} required type="number" inputMode="decimal" min={0.1} max={10000} step="any" placeholder={t('common.ph.tonnes')} value={qty} onChange={(e) => setQty(e.target.value)} />}
          </Field>
          <Field label={t('farmer.new.harvest')}>
            {(p) => <Input {...p} required type="month" value={harvest} max={thisMonth()} onChange={(e) => setHarvest(e.target.value)} />}
          </Field>
        </Step>
        )}

        {step === 1 && (
        <Step title={<Tx k="farmer.new.stepWhere" />}>
          <PlaceInput value={place} onChange={setPlace} />
        </Step>
        )}

        {step === 2 && (
        <Step title={<Tx k="farmer.new.stepPrice" />}>
          <Field label={t('farmer.new.price')}>
            {(p) => (
              <Input {...p} required type="number" inputMode="numeric" min={100} max={20000} step={1} placeholder={t('common.ph.price')} value={price} onChange={(e) => setPrice(e.target.value)} />
            )}
          </Field>
          <PriceBandBox place={place} onUse={(n) => setPrice(String(n))} />
        </Step>
        )}

        {step === 3 && (
        <Step title={<Tx k="farmer.new.stepPhotos" />}>
          {PHOTOS_CDN ? <PhotoPicker keys={photos} onChange={setPhotos} onBusy={setUploading} /> : <p className="text-muted">{t('farmer.new.photosOff')}</p>}
          <Field label={t('farmer.new.moisture')}>
            {(p) => <Input {...p} type="number" inputMode="decimal" min={0} max={100} step="any" placeholder={t('common.ph.moisture')} value={moisture} onChange={(e) => setMoisture(e.target.value)} />}
          </Field>
          <Field label={t('farmer.new.notes')}>
            {(p) => <Textarea {...p} maxLength={1000} placeholder={t('common.ph.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} />}
          </Field>
        </Step>
        )}

        {error && <ErrorBox message={error} />}
        <StepButtons step={step} total={STEPS} onBack={() => goToStep(setStep, step - 1)} busy={busy} disabled={uploading} finalKey="farmer.new.submit" />
      </form>
    </div>
  );
}

export default function Page() {
  return (
    <RequireRole roles={['farmer']}>
      <NewListing />
    </RequireRole>
  );
}
