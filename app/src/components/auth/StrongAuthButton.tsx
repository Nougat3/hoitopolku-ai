import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  getActiveStrongAuthProvider,
  getStrongAuthConfig,
  startStrongAuth,
  StrongAuthDisabledError,
  StrongAuthNotConfiguredError
} from '@/lib/strong-auth';

interface StrongAuthButtonProps {
  className?: string;
}

export function StrongAuthButton({ className = '' }: StrongAuthButtonProps) {
  const cfg = getStrongAuthConfig();
  const provider = getActiveStrongAuthProvider();
  const [busy, setBusy] = useState(false);

  if (!cfg.enabled && !cfg.showComingSoon) {
    return null;
  }

  const live = cfg.enabled && provider.isConfigured();
  const label = live
    ? `Kirjaudu pankkitunnuksilla (${provider.label})`
    : cfg.enabled
      ? `Vahva tunnistus — odottaa ${provider.label}-sopimusta`
      : 'Pankkitunnukset / mobiilivarmenne — tulossa';

  async function onClick() {
    if (!cfg.enabled) {
      toast('Vahva tunnistus kytketään päälle tuotantojulkaisussa.');
      return;
    }
    setBusy(true);
    try {
      await startStrongAuth();
    } catch (err) {
      if (err instanceof StrongAuthNotConfiguredError) {
        toast.error(err.message);
      } else if (err instanceof StrongAuthDisabledError) {
        toast('Vahva tunnistus ei ole käytössä.');
      } else {
        toast.error(err instanceof Error ? err.message : 'Tunnistus epäonnistui');
      }
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`w-full py-3 px-4 rounded-xl border text-sm font-semibold transition ${
        live
          ? 'border-[var(--k)] bg-white text-[var(--k)] hover:bg-[var(--g0)]'
          : 'border-dashed border-[var(--line)] bg-[var(--g0)] text-[var(--mid)]'
      } ${className}`}
      disabled={busy}
      onClick={() => void onClick()}
    >
      {busy ? 'Siirrytään tunnistukseen…' : label}
    </button>
  );
}
