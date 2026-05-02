import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const rootElement = document.getElementById('root')!;

if (!supabaseUrl || !supabaseAnonKey) {
  createRoot(rootElement).render(
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-red-500/20 p-8 rounded-[32px] max-w-md w-full text-center shadow-2xl">
        <h1 className="text-[#CCFF00] font-display font-black text-2xl uppercase italic tracking-tighter mb-4">Configuration Missing</h1>
        <p className="text-white/60 text-sm leading-relaxed mb-6">
          Please check your Environment Variables. The VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be defined for SPOTHUB to initialize.
        </p>
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-red-500 w-1/3" />
        </div>
      </div>
    </div>
  );
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
