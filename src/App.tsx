import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import FacilityDetail from './pages/FacilityDetail';
import MyBookings from './pages/MyBookings';
import DigitalTicket from './pages/DigitalTicket';
import OwnerDashboard from './pages/OwnerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminVerify from './pages/AdminVerify';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import Register from './pages/Register';
import Login from './pages/Login';
import LiveMonitor from './pages/LiveMonitor';
import BookingManagementCenter from './pages/BookingManagementCenter';
import PlayerDashboard from './pages/PlayerDashboard';
import VenuePage from './pages/VenuePage';
import CityPage from './pages/CityPage';
import StaffCheckIn from './pages/StaffCheckIn';
import SearchPage from './pages/SearchPage';
import Onboarding from './pages/Onboarding';
import AddCourts from './pages/owner/AddCourts';
import CompleteProfile from './pages/CompleteProfile';
import NotFound from './pages/NotFound';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from 'sonner';
import GlobalNotifications from './components/GlobalNotifications';
import { Activity } from 'lucide-react';
import { APIProvider } from '@vis.gl/react-google-maps';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

function MapsSplash() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-transparent text-white p-6 text-center">
      <div className="glass p-12 rounded-[48px] border-white/5 max-w-md space-y-8">
        <Activity className="text-lime mx-auto animate-pulse" size={48} />
        <div className="space-y-4">
          <h2 className="text-3xl font-display font-black uppercase italic tracking-tighter">Maps <span className="text-lime">Gateway</span> Offline</h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-loose">
            To enable the championship network visualization, you must initialize your Google Maps Platform key.
          </p>
        </div>
        
        <div className="space-y-4 text-left">
          <p className="text-[10px] font-black uppercase tracking-widest text-lime">Deployment Protocol:</p>
          <ol className="text-[10px] font-bold text-slate-400 space-y-3 list-decimal list-inside uppercase tracking-widest">
            <li className="leading-relaxed">Access <a href="https://console.cloud.google.com/google/maps-apis/start" target="_blank" rel="noopener" className="text-white underline">Google Cloud Console</a></li>
            <li className="leading-relaxed">Navigate to <span className="text-white">Settings (⚙) → Secrets</span></li>
            <li className="leading-relaxed">Create <code className="text-lime bg-lime/10 px-1 rounded">GOOGLE_MAPS_PLATFORM_KEY</code></li>
            <li className="leading-relaxed">The system will auto-rebuild on commit</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function PrivateRoute({ children, role }: { children: React.ReactNode, role?: string }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-transparent text-white">
      <div className="relative">
        <div className="w-24 h-24 bg-lime/10 rounded-full flex items-center justify-center animate-pulse">
          <div className="w-16 h-16 bg-lime/20 rounded-full flex items-center justify-center">
            <Activity className="text-lime animate-pulse" size={32} />
          </div>
        </div>
        <div className="absolute inset-0 border-4 border-lime/5 border-t-lime rounded-full animate-spin" />
      </div>
      <div className="mt-12 flex flex-col items-center gap-4">
        <h2 className="text-xl font-display font-black uppercase italic tracking-widest animate-pulse">Syncing <span className="text-lime">Identity</span></h2>
        <div className="flex gap-1">
          {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 bg-lime rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}
        </div>
      </div>
    </div>
  );
  
  if (!user) return <Navigate to="/" />;

  // Force role completion if UNASSIGNED
  if (profile?.role === 'UNASSIGNED' && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" />;
  }
  
  const roleUpper = (profile?.role || '').toUpperCase();
  const isSuperAdmin = roleUpper === 'SUPER_ADMIN' || user.email === 'miguel@builtbymiguel.net';
  
  if (role && (roleUpper !== role.toUpperCase() && !isSuperAdmin)) {
    // Specifically allow STAFF to access owner path if role is OWNER
    if (role.toUpperCase() === 'OWNER' && (roleUpper === 'STAFF' || roleUpper === 'ADMIN')) {
      return <>{children}</>;
    }
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

function StaffRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const [isStaff, setIsStaff] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (user && profile) {
      if (profile.role === 'OWNER' || profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN') {
        setIsStaff(true);
        return;
      }

      const checkStaff = async () => {
        const { data, error } = await supabase
          .from('staff_access')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setIsStaff(!!data && !error);
      };
      checkStaff();
    } else if (!loading) {
      setIsStaff(false);
    }
  }, [user, profile, loading]);

  if (loading || isStaff === null) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-transparent text-white">
      <Activity className="text-lime animate-spin mb-4" size={32} />
      <span className="text-[10px] font-black uppercase tracking-widest text-lime">Verifying Credentials...</span>
    </div>
  );

  if (!isStaff) return <Navigate to="/" />;

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-transparent text-white">
      <Activity className="text-lime animate-spin mb-4" size={32} />
      <span className="text-[10px] font-black uppercase tracking-widest text-lime">Authenticating Master Admin...</span>
    </div>
  );

  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN';
  if (!user || !isAdmin) return <Navigate to="/" />;

  return <>{children}</>;
}

export default function App() {
  if (!hasValidKey) return <MapsSplash />;

  return (
    <AuthProvider>
      <APIProvider apiKey={API_KEY} version="weekly">
        <BrowserRouter>
        <GlobalNotifications />
        <Toaster 
          position="top-center" 
          toastOptions={{
            className: 'sonner-toast-custom px-6 py-4 rounded-[20px] backdrop-blur-md border border-white/10 shadow-2xl break-words whitespace-normal leading-relaxed text-[13px] sm:text-xs md:text-sm font-bold uppercase tracking-widest text-white',
            style: {
              background: '#1A1A1A',
              fontFamily: '"Outfit", sans-serif',
              zIndex: 99999,
            }
          }}
          expand={false}
        />
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="register" element={<Register />} />
              <Route path="login" element={<Login />} />
              <Route path="complete-profile" element={
                <PrivateRoute>
                  <CompleteProfile />
                </PrivateRoute>
              } />
              <Route path="onboarding" element={
                <PrivateRoute role="OWNER">
                  <Onboarding />
                </PrivateRoute>
              } />
              <Route path="manage/venues/:venueId/courts" element={
                <PrivateRoute role="OWNER">
                  <AddCourts />
                </PrivateRoute>
              } />
              <Route path="facility/:id" element={<FacilityDetail />} />
              <Route path="v/:id" element={<VenuePage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path=":country/:city" element={<CityPage />} />
              <Route path=":country_code/:city/:slug" element={<VenuePage />} />
              <Route 
                path="dashboard" 
                element={
                  <PrivateRoute>
                    <PlayerDashboard />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="my-bookings" 
                element={
                  <PrivateRoute>
                    <MyBookings />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="my-bookings/:id" 
                element={
                  <PrivateRoute>
                    <DigitalTicket />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="owner" 
                element={
                  <PrivateRoute role="OWNER">
                    <OwnerDashboard />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="admin" 
                element={
                  <PrivateRoute role="super_admin">
                    <AdminDashboard />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="admin/verify" 
                element={
                  <PrivateRoute role="ADMIN">
                    <AdminVerify />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="profile" 
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="messages" 
                element={
                  <PrivateRoute>
                    <Messages />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="facility-hub/live-monitor" 
                element={
                  <PrivateRoute>
                    <LiveMonitor />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="management/inbox" 
                element={
                  <PrivateRoute role="OWNER">
                    <BookingManagementCenter />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="staff/check-in" 
                element={
                  <StaffRoute>
                    <StaffCheckIn />
                  </StaffRoute>
                } 
              />
              <Route 
                path="admin/dashboard" 
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                } 
              />
              {/* Catch-all 404 */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
      </APIProvider>
    </AuthProvider>
  );
}
