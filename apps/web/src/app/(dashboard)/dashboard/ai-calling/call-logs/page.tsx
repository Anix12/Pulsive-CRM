'use client';

import { PhoneCall } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';

export default function AiCallingCallLogsPage() {
  return (
    <ComingSoon
      title="Call Logs"
      description="Full history of inbound and outbound calls with recordings and outcomes."
      icon={PhoneCall}
    />
  );
}
