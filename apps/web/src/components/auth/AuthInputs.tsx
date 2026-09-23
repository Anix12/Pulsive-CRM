'use client';

import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Lock, Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const fieldCls =
  'w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3.5 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

export const IconInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { icon: LucideIcon }
>(({ icon: Icon, className, ...props }, ref) => (
  <div className="relative">
    <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    <input ref={ref} {...props} className={cn(fieldCls, className)} />
  </div>
));
IconInput.displayName = 'IconInput';

export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>
>(({ className, ...props }, ref) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        ref={ref}
        type={visible ? 'text' : 'password'}
        {...props}
        className={cn(fieldCls, 'pr-9', className)}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});
PasswordInput.displayName = 'PasswordInput';
