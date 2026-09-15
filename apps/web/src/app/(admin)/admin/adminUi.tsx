'use client';

import { Modal } from '@/components/ui/Modal';

export const planBadge: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-600',
  STARTER: 'bg-blue-50 text-blue-700',
  PRO: 'bg-purple-50 text-purple-700',
  ENTERPRISE: 'bg-indigo-50 text-indigo-700',
};

export const statusBadge: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  SUSPENDED: 'bg-amber-50 text-amber-700',
  CANCELLED: 'bg-rose-50 text-rose-600',
};

export const statusLabel: Record<string, string> = {
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  CANCELLED: 'Cancelled',
};

const avatarPalette = [
  'bg-blue-50 text-blue-700',
  'bg-emerald-50 text-emerald-700',
  'bg-purple-50 text-purple-700',
  'bg-amber-50 text-amber-700',
  'bg-pink-50 text-pink-700',
  'bg-cyan-50 text-cyan-700',
];

export function avatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return avatarPalette[hash % avatarPalette.length];
}

/** Used for any card/action that mirrors the reference design but has no backend behind it yet. */
export function ComingSoonModal({
  open,
  onClose,
  feature,
}: {
  open: boolean;
  onClose: () => void;
  feature: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={feature} size="sm">
      <p className="text-sm text-gray-600">
        This isn't wired up to the backend yet — the UI is ready, but the API to power it hasn't
        been built. Let us know if you'd like this prioritized.
      </p>
      <div className="mt-5 flex justify-end">
        <button
          onClick={onClose}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          Got it
        </button>
      </div>
    </Modal>
  );
}

export function PreviewBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-amber-100">
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-white">
        !
      </span>
      {children}
    </div>
  );
}
