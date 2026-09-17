'use client';

import { Package } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';

export default function ShippingOrdersPage() {
  return (
    <ComingSoon
      title="Orders"
      description="Track customer orders ready for fulfillment and dispatch."
      icon={Package}
    />
  );
}
