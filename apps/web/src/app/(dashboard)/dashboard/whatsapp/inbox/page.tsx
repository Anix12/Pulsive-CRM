import { redirect } from 'next/navigation';

export default function WhatsappInboxPage() {
  redirect('/dashboard/messages');
}
