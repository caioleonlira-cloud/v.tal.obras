import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Previne que rejeições de promessas não capturadas (ex: Firebase offline ou aborts) quebrem a aplicação
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('Unhandled Promise Rejection prevenida:', event.reason);
    // Se o erro for de conexão, cota ou abort do Firebase, previne o popup do browser
    if (event.reason?.name === 'FirebaseError' || event.reason?.message?.includes('Firestore')) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
