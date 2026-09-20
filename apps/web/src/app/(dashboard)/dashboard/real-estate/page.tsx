import { notFound } from 'next/navigation';
import { FeatureHub } from '@/components/ui/FeatureHub';
import { navSections } from '@/lib/navSections';

export default function Page() {
  const section = navSections.find((s) => s.key === 'real-estate');
  if (!section) notFound();
  return <FeatureHub section={section} />;
}
