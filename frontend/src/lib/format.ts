const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });

export const rupees = (n: number) => inr.format(n);
export const perTonne = (n: number) => `${inr.format(n)}/tonne`;
export const tonnes = (n: number) => `${num.format(n)} ${n === 1 ? 'tonne' : 'tonnes'}`;
export const km = (n: number) => `${num.format(n)} km`;
export const count = (n: number) => num.format(n);
export const date = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
