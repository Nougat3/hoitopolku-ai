import { Link, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { BillingPanel } from '@/components/doctor/BillingPanel';
import { useAuthStore } from '@/hooks/useAuthStore';
import { supabase } from '@/lib/supabase';

export default function BillingPage() {
  const { appUser } = useAuthStore();
  const [params] = useSearchParams();

  useEffect(() => {
    const status = params.get('status');
    if (status === 'success') toast.success('Kiitos! Tilaus vahvistetaan pian (webhook).');
    if (status === 'cancel') toast('Checkout peruutettiin.');
  }, [params]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-[var(--w)]">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-start justify-between gap-3">
          <div>
            <Link to="/doctor" className="text-sm font-semibold text-[var(--blue)]">
              ← Työpöytä
            </Link>
            <h1 className="text-xl font-extrabold mt-1">Laskutus</h1>
            <p className="text-sm text-[var(--mid)]">
              {appUser?.full_name ?? 'Lääkäri'} · Stripe-pohja
            </p>
          </div>
          <button
            type="button"
            className="text-sm font-semibold text-[var(--mid)]"
            onClick={() => void signOut()}
          >
            Kirjaudu ulos
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <BillingPanel />
      </main>
    </div>
  );
}
