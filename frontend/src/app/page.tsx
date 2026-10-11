import { Hero } from '../components/landing/Hero';
import { BiggerPicture } from '../components/landing/BiggerPicture';
import { ImpactCounter } from '../components/landing/ImpactCounter';
import { FairPrice, FinalCta, HowItWorks, Manifesto, WhoBuys } from '../components/landing/Sections';

export default function Page() {
  return (
    <>
      <Hero />
      <Manifesto />
      <ImpactCounter />
      <BiggerPicture />
      <HowItWorks />
      <FairPrice />
      <WhoBuys />
      <FinalCta />
    </>
  );
}
