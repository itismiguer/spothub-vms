console.log('--- APP STARTING ---');
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('Root element not found');
} else {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    createRoot(rootElement).render(
      <div style={{ 
        backgroundColor: '#000', 
        color: '#ff4d4d', 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h1 style={{ fontSize: '4rem', fontWeight: '900', margin: '0' }}>MISSING KEYS</h1>
        <p style={{ color: '#fff', opacity: 0.5, marginTop: '10px', fontSize: '1.2rem' }}>
          Please configure VITE_SUPABASE_URL in your environment.
        </p>
      </div>
    );
  } else {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  }
}
