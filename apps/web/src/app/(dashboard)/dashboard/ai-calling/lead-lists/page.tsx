'use client';

import { ListChecks } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';

export default function AiCallingLeadListsPage() {
  return (
    <ComingSoon
      title="Lead Lists"
      description="Organize leads into dialing lists for outbound AI calling campaigns."
      icon={ListChecks}
    />
  );
}
