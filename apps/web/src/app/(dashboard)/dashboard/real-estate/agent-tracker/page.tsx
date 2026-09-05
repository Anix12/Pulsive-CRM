'use client';

import { Radar } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';

export default function RealEstateAgentTrackerPage() {
  return (
    <ComingSoon
      title="Agent Tracker"
      description="Monitor field agent activity, location, and site visit performance."
      icon={Radar}
    />
  );
}
