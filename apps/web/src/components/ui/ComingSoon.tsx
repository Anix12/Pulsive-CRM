import type { LucideIcon } from 'lucide-react';
import { Sparkles } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export function ComingSoon({ title, description, icon: Icon }: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>

      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          {Icon ? <Icon className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
        </div>
        <span className="mt-4 inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
          Coming Soon
        </span>
        <p className="mt-3 max-w-sm text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}
