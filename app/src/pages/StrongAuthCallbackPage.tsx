import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { exchangeStrongAuthCode } from '@/lib/strong-auth/exchange';
import { getStrongAuthConfig } from '@/lib/strong-auth';

export default function StrongAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Vahvistetaan tunnistusta…');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const cfg = getStrongAuthConfig();
    if (!cfg.enabled) {
      setFailed(true);
      setMessage('Vahva tunnistus ei ole käytössä.');
      return;
    }

    const error = params.get('error');
    const errorDesc = params.get('error_description');
    if (error) {
      setFailed(true);
      setMessage(errorDesc || error);
      return;
    }

    const code = params.get('code');
    const state = params.get('state');
    if (!code || !state) {
      setFailed(true);
      setMessage('IdP ei palauttanut authorization codea.');
      return;
    }

    let cancelled = false;
    void (async () => {
      const result = await exchangeStrongAuthCode(code, state);
      if (cancelled) return;
      if (!result.ok) {
        setFailed(true);
        setMessage(result.reason);
        return;
      }
      setMessage('Tunnistus onnistui. Siirrytään…');
      navigate('/', { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--w)]">
      <div className="max-w-md w-full rounded-3xl border border-[var(--line)] bg-white p-6 text-center">
        <h1 className="text-xl font-bold mb-2">Vahva tunnistus</h1>
        <p className={`text-sm ${failed ? 'text-[var(--red)]' : 'text-[var(--mid)]'}`}>
          {message}
        </p>
        {failed && (
          <Link to="/login" className="btn-primary inline-flex mt-5">
            Takaisin kirjautumiseen
          </Link>
        )}
      </div>
    </div>
  );
}
