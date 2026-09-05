'use client';

import { Sparkles } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';

export default function RealEstatePropertyMatchPage() {
  return (
    <ComingSoon
      title="Property Match"
      description="AI-powered matching of leads to the right property listings based on budget and preferences."
      icon={Sparkles}
    />
  );
}
