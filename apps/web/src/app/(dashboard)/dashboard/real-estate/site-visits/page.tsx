'use client';

import { MapPin } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';

export default function RealEstateSiteVisitsPage() {
  return (
    <ComingSoon
      title="Site Visits"
      description="Schedule and track prospect site visits across your projects."
      icon={MapPin}
    />
  );
}
