'use client';

import { BarChart3 } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';

export default function WhatsappAnalyticsPage() {
  return (
    <ComingSoon
      title="WhatsApp Analytics"
      description="Delivery, read, and reply rates across your WhatsApp conversations and campaigns."
      icon={BarChart3}
    />
  );
}
