import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/hooks/useAuthStore';
import LoginPage from '@/pages/LoginPage';
import StrongAuthCallbackPage from '@/pages/StrongAuthCallbackPage';
import PatientDashboard from '@/pages/patient/Dashboard';
import DoctorDashboard from '@/pages/doctor/Dashboard';
import BillingPage from '@/pages/doctor/BillingPage';
import type { AppUser } from '@/types/database';

function homeForRole(role: AppUser['role'] | undefined): string {
  if (role === 'laakari' || role === 'yllapito') return '/doctor';
  return '/patient';
}

function DoctorRoutes() {
  return (
    <Routes>
      <Route index element={<DoctorDashboard />} />
      <Route path="billing" element={<BillingPage />} />
      <Route path="*" element={<Navigate to="/doctor" replace />} />
    </Routes>
  );
}

function App() {
  const { user, appUser, setUser, setAppUser, loading, setLoading } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading]);

  useEffect(() => {
    if (!user) {
      setAppUser(null);
      return;
    }

    supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()
      .then(({ data }) => {
        setAppUser((data as AppUser | null) ?? null);
      });
  }, [user, setAppUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--w)]">
        <div className="text-[var(--mid)]">Ladataan…</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user && appUser ? (
            <Navigate to={homeForRole(appUser.role)} replace />
          ) : (
            <LoginPage />
          )
        }
      />

      <Route path="/auth/callback" element={<StrongAuthCallbackPage />} />

      <Route
        path="/patient/*"
        element={
          user && appUser?.role === 'potilas' ? (
            <PatientDashboard />
          ) : user && appUser ? (
            <Navigate to={homeForRole(appUser.role)} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/doctor/*"
        element={
          user && (appUser?.role === 'laakari' || appUser?.role === 'yllapito') ? (
            <DoctorRoutes />
          ) : user && appUser ? (
            <Navigate to={homeForRole(appUser.role)} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/"
        element={
          user && appUser ? (
            <Navigate to={homeForRole(appUser.role)} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
