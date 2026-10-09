'use client';
import { useState } from 'react';
import { api } from '../../lib/api';
import { photoUrl } from '../../lib/config';
import { useI18n } from '../../lib/i18n';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5_000_000;
const MAX_PHOTOS = 4;

/** Uploads each chosen photo straight to S3 via a presigned POST; reports the S3 keys. */
export function PhotoPicker({ keys, onChange, onBusy }: { keys: string[]; onChange: (k: string[]) => void; onBusy: (b: boolean) => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setError(null);
    if (!TYPES.includes(file.type)) return setError(t('farmer.new.photoBadType'));
    if (file.size > MAX_BYTES) return setError(t('farmer.new.photoTooBig'));
    setBusy(true);
    onBusy(true);
    try {
      const { url, fields, key } = await api<{ url: string; fields: Record<string, string>; key: string }>('/uploads/presign', {
        method: 'POST',
        body: { contentType: file.type },
      });
      const form = new FormData();
      Object.entries(fields).forEach(([k, v]) => form.append(k, v));
      form.append('file', file);
      const res = await fetch(url, { method: 'POST', body: form });
      if (!res.ok) throw new Error();
      onChange([...keys, key]);
    } catch (e) {
      setError((e as Error).message || t('farmer.new.photoFailed'));
    } finally {
      setBusy(false);
      onBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{t('farmer.new.photosHint')}</p>
      {keys.length > 0 && (
        <ul className="grid grid-cols-2 gap-3">
          {keys.map((k, i) => (
            <li key={k} className="relative overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element -- static export, CDN image */}
              <img src={photoUrl(k)} alt="" className="aspect-square w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(keys.filter((x) => x !== k))}
                aria-label={t('farmer.new.removePhoto', { n: i + 1 })}
                className="absolute right-1 top-1 flex size-12 items-center justify-center rounded-full bg-ink/80 text-2xl text-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {keys.length < MAX_PHOTOS && (
        <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-surface px-5 py-3 font-semibold text-field hover:border-field has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-straw">
          <input
            type="file"
            accept={TYPES.join(',')}
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) upload(f);
            }}
          />
          {busy ? t('farmer.new.uploading') : `+ ${t('farmer.new.addPhoto')}`}
        </label>
      )}
      {error && (
        <p className="text-sm text-ember" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
