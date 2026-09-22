'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { errorMessage, useDeleteLeadView, type LeadView } from '@/lib/leadViews';

export function DeleteViewConfirm({ view, onClose }: { view: LeadView | null; onClose: () => void }) {
  const del = useDeleteLeadView();
  const [error, setError] = useState('');

  const confirm = async () => {
    if (!view) return;
    setError('');
    try {
      await del.mutateAsync(view.id);
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not delete the view'));
    }
  };

  return (
    <Modal open={!!view} onClose={onClose} size="sm" title="Delete this view?">
      <div className="mt-4 flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <p className="text-sm leading-relaxed text-gray-600">
          <span className="font-semibold text-gray-900">{view?.name}</span> will be removed for everyone in your workspace.
          Your leads are not affected.
        </p>
      </div>
      {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="rounded-full px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100">
          Cancel
        </button>
        <button
          onClick={confirm}
          disabled={del.isPending}
          className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
        >
          {del.isPending ? 'Deleting…' : 'Delete view'}
        </button>
      </div>
    </Modal>
  );
}
