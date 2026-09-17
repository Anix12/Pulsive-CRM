'use client';

import { Workflow } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';

export default function WhatsappAutomationPage() {
  return (
    <ComingSoon
      title="WhatsApp Automation"
      description="Build automated WhatsApp flows triggered by contact, deal, and campaign events."
      icon={Workflow}
    />
  );
}
