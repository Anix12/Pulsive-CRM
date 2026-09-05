'use client';

import { Building2 } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';

export default function RealEstateProjectsPage() {
  return (
    <ComingSoon
      title="Projects"
      description="Manage real estate projects, towers, and unit inventory."
      icon={Building2}
    />
  );
}
