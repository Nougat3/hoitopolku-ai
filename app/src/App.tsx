import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/hooks/useAuthStore';

// Pages (to be created)
import LoginPage from '@/pages/LoginPage';
import PatientDashboard from '@/pages/patient/Dashboard';
import DoctorDashboard from '@/pages/doctor/Dashboard';

function App() {
  const { user, setUser, setProfile, loading, setLoading } = useAuthStore();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading]);

  // Fetch profile when user changes
  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setProfile(data);
          }
        });
    } else {
      setProfile(null);
    }
  }, [user, setProfile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFAF7]">
        <div className="text-[#6B6860]">Ladataan...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      {/* Protected routes */}
      <Route
        path="/patient/*"
        element={
          user ? <PatientDashboard /> : <Navigate to="/login" replace />
        }
      />
      
      <Route
        path="/doctor/*"
        element={
          user ? <DoctorDashboard /> : <Navigate to="/login" replace />
        }
      />

      {/* Default redirect based on role */}
      <Route
        path="/"
        element={
          user ? (
            <Navigate to="/patient" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;
