'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, User, Mail } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { IconInput, PasswordInput } from '@/components/auth/AuthInputs';

const schema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase and a number'),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const register_ = useAuthStore((s) => s.register);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await register_(data);
      router.push('/dashboard');
    } catch (err: any) {
      const apiError = err?.response?.data?.error;
      const detail = apiError?.details ? (Object.values(apiError.details).flat()[0] as string) : undefined;
      setError('root', { message: detail || apiError?.message || 'Registration failed. Please try again.' });
    }
  };

  return (
    <AuthShell>
      <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Get started free</span>
      <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900">Set up your CRM.</h2>
      <p className="mt-1 text-sm text-gray-500">Takes a couple of minutes — no card required.</p>

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
          <label className="block text-sm font-medium text-gray-700">Company name</label>
          <IconInput {...register('companyName')} icon={Building2} placeholder="Acme Pvt Ltd" autoFocus />
          {errors.companyName && <p className="text-xs text-red-500">{errors.companyName.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">First name</label>
            <IconInput {...register('firstName')} icon={User} placeholder="Rahul" />
            {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Last name</label>
            <IconInput {...register('lastName')} icon={User} placeholder="Sharma" />
            {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">Work email</label>
          <IconInput {...register('email')} icon={Mail} type="email" placeholder="rahul@acme.com" />
          {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <PasswordInput {...register('password')} placeholder="••••••••" />
          {errors.password ? (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          ) : (
            <p className="text-xs text-gray-400">8+ characters with uppercase, lowercase and a number.</p>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isSubmitting}
          className="btn-gradient-brand flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Creating account…' : (
            <>
              Create free account <ArrowRight className="h-4 w-4" />
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
