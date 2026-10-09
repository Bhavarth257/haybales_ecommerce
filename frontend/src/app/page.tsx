import { Hero } from '../components/landing/Hero';
import { ImpactCounter } from '../components/landing/ImpactCounter';
import { FairPrice, FinalCta, HowItWorks, Manifesto, WhoBuys } from '../components/landing/Sections';

export default function Page() {
  return (
    <>
      <Hero />
      <Manifesto />
      <ImpactCounter />
      <HowItWorks />
      <FairPrice />
      <WhoBuys />
      <FinalCta />
    </>
  );
}
