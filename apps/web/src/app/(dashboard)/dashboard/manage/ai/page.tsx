'use client';

import { Sparkles } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';

export default function ManageAiPage() {
  return (
    <ComingSoon
      title="AI Settings"
      description="Configure AI-assisted features — drafting, forecasting, and call intelligence — across your workspace."
      icon={Sparkles}
    />
  );
}
