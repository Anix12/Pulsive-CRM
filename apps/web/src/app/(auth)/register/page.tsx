'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const schema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const register_ = useAuthStore((s) => s.register);
  const router = useRouter();

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await register_(data);
      router.push('/onboarding');
    } catch (err: any) {
      setError('root', { message: err?.response?.data?.error?.message || 'Registration failed' });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Start your free trial</h1>
          <p className="mt-2 text-sm text-gray-600">Set up your CRM in minutes</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5 rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          {errors.root && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{errors.root.message}</div>
          )}

          {[
            { name: 'companyName' as const, label: 'Company Name', placeholder: 'Acme Pvt Ltd', type: 'text' },
            { name: 'firstName' as const, label: 'First Name', placeholder: 'Rahul', type: 'text' },
            { name: 'lastName' as const, label: 'Last Name', placeholder: 'Sharma', type: 'text' },
            { name: 'email' as const, label: 'Work Email', placeholder: 'rahul@acme.com', type: 'email' },
            { name: 'password' as const, label: 'Password', placeholder: '••••••••', type: 'password' },
          ].map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700">{field.label}</label>
              <input
                {...register(field.name)}
                type={field.type}
                placeholder={field.placeholder}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {errors[field.name] && (
                <p className="mt-1 text-xs text-red-500">{errors[field.name]?.message}</p>
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating account...' : 'Create free account'}
          </button>

          <p className="text-center text-xs text-gray-500">
            By signing up you agree to our Terms of Service and Privacy Policy.
          </p>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
