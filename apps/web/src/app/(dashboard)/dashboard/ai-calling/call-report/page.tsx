'use client';

import { Sparkles } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';

export default function AiCallingCallReportPage() {
  return (
    <ComingSoon
      title="AI Call Report"
      description="AI-generated call transcripts, summaries, and sentiment analysis."
      icon={Sparkles}
    />
  );
}
