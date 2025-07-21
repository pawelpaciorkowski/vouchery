import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Komponenty ładowane dynamicznie (lazy loading)
const AlabForm = React.lazy(() => import('./AlabForm').then(module => ({ default: module.AlabForm })));
const AdminPanel = React.lazy(() => import('./AdminPanel').then(module => ({ default: module.AdminPanel })));
const AdminLogin = React.lazy(() => import('./AdminLogin'));

// Prosty komponent na czas ładowania
const LoadingFallback = () => (
  <div className="flex justify-center items-center min-h-screen">
    <p>Ładowanie...</p>
  </div>
);


const isPublicFormOnly = import.meta.env.VITE_APP_MODE === 'public';

function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {isPublicFormOnly ? (
            // JEŚLI jest to wersja publiczna, renderuj TYLKO formularz pod każdym adresem
            <Route path="/*" element={<AlabForm />} />
          ) : (
            // W przeciwnym razie (wersja pełna), renderuj wszystkie ścieżki
            <>
              <Route path="/" element={<AlabForm />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/panel" element={<AdminPanel />} />
            </>
          )}
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;