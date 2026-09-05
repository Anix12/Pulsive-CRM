import { FeatureHub } from '@/components/ui/FeatureHub';
import { navSections } from '@/lib/navSections';

export default function Page() {
  const section = navSections.find((s) => s.key === 'automate')!;
  return <FeatureHub section={section} />;
}
