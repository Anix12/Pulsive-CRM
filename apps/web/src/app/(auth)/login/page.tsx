'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowRight, Mail } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { IconInput, PasswordInput } from '@/components/auth/AuthInputs';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
      const user = useAuthStore.getState().user;
      if (user?.role === 'AGENT') {
        const params = new URLSearchParams({
          name: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
        });
        window.location.href = `/user-dashboard.html?${params.toString()}`;
        return;
      }
      router.push('/dashboard');
    } catch (err: any) {
      // Show the server's real reason (rate limited, network error, etc.) instead of
      // always blaming the credentials - that hid genuine failures from the user.
      const apiMessage = err?.response?.data?.error?.message;
      const message = apiMessage || (err?.request && !err?.response ? 'Could not reach the server. Check your connection and try again.' : 'Invalid email or password');
      setError('root', { message });
    }
  };

  return (
    <AuthShell>
      <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Welcome back</span>
      <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900">Good to see you again.</h2>
      <p className="mt-1 text-sm text-gray-500">Enter your details to continue where you left off.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        {errors.root && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {errors.root.message}
          </motion.div>
        )}

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">Email address</label>
          <IconInput {...register('email')} icon={Mail} type="email" placeholder="you@example.com" autoFocus />
          {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <PasswordInput {...register('password')} placeholder="••••••••" />
          {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/30" />
            Remember me
          </label>
          <span className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-500">
            Forgot password?
          </span>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isSubmitting}
          className="btn-gradient-brand flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in…' : (
            <>
              Continue <ArrowRight className="h-4 w-4" />
            </>
          )}
        </motion.button>

        <p className="text-center text-xs text-gray-400">
          By continuing, you agree to our{' '}
          <span className="font-medium text-blue-600">Terms</span> and{' '}
          <span className="font-medium text-blue-600">Privacy Policy</span>.
        </p>
      </form>
    </AuthShell>
  );
}
