import { redirect } from 'next/navigation';

export default function AdminRootPage() {
  // Redirect root to dashboard
  redirect('/dashboard');
}
