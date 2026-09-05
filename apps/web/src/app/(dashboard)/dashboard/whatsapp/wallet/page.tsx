'use client';

import { Wallet } from 'lucide-react';
import { ComingSoon } from '@/components/ui/ComingSoon';

export default function WhatsappWalletPage() {
  return (
    <ComingSoon
      title="WA Wallet"
      description="Track your WhatsApp messaging credit balance, usage, and top-ups."
      icon={Wallet}
    />
  );
}
