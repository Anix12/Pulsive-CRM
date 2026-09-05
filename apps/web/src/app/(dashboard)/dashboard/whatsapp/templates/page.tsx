'use client';

import { FileText } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';

export default function WhatsappTemplatesPage() {
  return (
    <ComingSoon
      title="WhatsApp Templates"
      description="Manage and submit Meta-approved WhatsApp message templates for campaigns and automations."
      icon={FileText}
    />
  );
}
