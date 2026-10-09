import type { ReactNode } from 'react';

/** Big tappable radio buttons: easier than a dropdown for a handful of options. */
export function ChoiceGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  cols = 2,
}: {
  legend: ReactNode;
  name: string;
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  cols?: 2 | 3;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-1.5 block text-sm font-semibold text-ink">{legend}</legend>
      <div className={`grid gap-2 ${cols === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {options.map((o) => (
          <label
            key={o.value}
            className="press flex min-h-14 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface px-2 py-2 text-center leading-tight font-semibold active:bg-paper has-[:checked]:border-2 has-[:checked]:border-field has-[:checked]:bg-field-soft has-[:checked]:text-field-strong has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-straw"
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
