import { LinkButton, PageHeader } from '../components/ui';
import { Tx } from '../lib/i18n';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title={<Tx k="common.notFound.title" />} sub={<Tx k="common.notFound.sub" />} />
      <LinkButton href="/">
        <Tx k="common.notFound.home" />
      </LinkButton>
    </div>
  );
}
