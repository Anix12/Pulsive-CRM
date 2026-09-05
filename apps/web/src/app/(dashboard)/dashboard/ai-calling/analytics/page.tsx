'use client';

import { BarChart3 } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';

export default function AiCallingAnalyticsPage() {
  return (
    <ComingSoon
      title="AI Calling Analytics"
      description="Call volume, connect rate, and agent performance metrics."
      icon={BarChart3}
    />
  );
}
