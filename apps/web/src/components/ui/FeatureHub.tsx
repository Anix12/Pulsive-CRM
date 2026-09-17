import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { NavSection } from '@/lib/navSections';

export function FeatureHub({ section }: { section: NavSection }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{section.label}</h1>
        <p className="mt-1 text-sm text-gray-500">{section.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {section.items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group relative flex flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-blue-200"
            >
              {item.comingSoon && (
                <span className="absolute right-4 top-4 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
                  Coming Soon
                </span>
              )}
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Icon className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="mt-3.5 text-[15px] font-semibold text-gray-900">{item.label}</h3>
              <p className="mt-1 flex-1 text-[13px] leading-relaxed text-gray-500">{item.description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-blue-600 transition-colors group-hover:text-blue-700">
                Open
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
