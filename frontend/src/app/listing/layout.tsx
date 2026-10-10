import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Stubble listing' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
