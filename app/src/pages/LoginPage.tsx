import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase, handleSupabaseError } from '@/lib/supabase';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (error) throw error;

      const authId = data.user?.id;
      if (!authId) throw new Error('Kirjautuminen epäonnistui');

      const { data: appUser, error: uErr } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authId)
        .single();
      if (uErr) throw uErr;

      toast.success(`Tervetuloa, ${appUser.full_name ?? appUser.email}`);
      if (appUser.role === 'laakari' || appUser.role === 'yllapito') {
        navigate('/doctor', { replace: true });
      } else {
        navigate('/patient', { replace: true });
      }
    } catch (err) {
      toast.error(handleSupabaseError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--w)] flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-3 h-3 rounded-full bg-[var(--g)]" />
            <span className="text-sm font-bold tracking-wide text-[var(--g)] uppercase">
              Hoitopolku
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Kirjaudu sisään</h1>
          <p className="text-[var(--mid)] mt-2 text-sm">
            Potilas: p@demo.fi · Lääkäri: l@demo.fi · salasana demo12
          </p>
        </div>

        <form
          onSubmit={(e) => void onSubmit(e)}
          className="rounded-3xl border border-[var(--line)] bg-white p-6 space-y-4 shadow-sm"
        >
          <label className="block">
            <span className="text-sm text-[var(--mid)]">Sähköposti</span>
            <input
              className="field"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="text-sm text-[var(--mid)]">Salasana</span>
            <input
              className="field"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Kirjaudutaan…' : 'Kirjaudu'}
          </button>
        </form>
      </div>
    </div>
  );
}
