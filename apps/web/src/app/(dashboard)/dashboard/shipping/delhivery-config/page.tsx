'use client';

import { Settings2 } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';

export default function ShippingDelhiveryConfigPage() {
  return (
    <ComingSoon
      title="Delhivery Config"
      description="Configure your Delhivery courier API credentials and pickup locations."
      icon={Settings2}
    />
  );
}
