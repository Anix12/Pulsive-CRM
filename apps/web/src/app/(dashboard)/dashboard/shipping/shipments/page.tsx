'use client';

import { Truck } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';

export default function ShippingShipmentsPage() {
  return (
    <ComingSoon
      title="Shipments"
      description="Monitor shipment status, tracking numbers, and delivery updates."
      icon={Truck}
    />
  );
}
