'use client';

import { CalendarCheck } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';

export default function RealEstateBookingsPage() {
  return (
    <ComingSoon
      title="Bookings"
      description="Track unit bookings, payment milestones, and booking status."
      icon={CalendarCheck}
    />
  );
}
