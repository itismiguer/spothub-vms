import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import FacilityDetail from './pages/FacilityDetail';
import MyBookings from './pages/MyBookings';
import OwnerDashboard from './pages/OwnerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminVerify from './pages/AdminVerify';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import Register from './pages/Register';
import Login from './pages/Login';
import LiveMonitor from './pages/LiveMonitor';
import BookingManagementCenter from './pages/BookingManagementCenter';
import VenuePage from './pages/VenuePage';
import Layout from './components/Layout';
import { Toaster } from 'sonner';
import GlobalNotifications from './components/GlobalNotifications';
import { Activity } from 'lucide-react';

function PrivateRoute({ children, role }: { children: React.ReactNode, role?: string }) {
  const { user, profile, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#000000] text-white">
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
  
  const isSuperAdmin = profile?.role === 'super_admin' || user.email === 'miguel@builtbymiguel.net';
  
  if (role && (profile?.role !== role && !isSuperAdmin)) {
    // Specifically allow STAFF to access owner path if role is OWNER
    if (role === 'OWNER' && (profile?.role === 'STAFF' || profile?.role === 'ADMIN')) {
      return <>{children}</>;
    }
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
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
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="register" element={<Register />} />
            <Route path="login" element={<Login />} />
            <Route path="facility/:id" element={<FacilityDetail />} />
            <Route path="v/:id" element={<VenuePage />} />
            <Route 
              path="my-bookings" 
              element={
                <PrivateRoute>
                  <MyBookings />
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
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
