import React, { Suspense } from 'react'; // Zaktualizowany import
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const AlabForm = React.lazy(() =>
  import('./AlabForm').then(module => ({ default: module.AlabForm }))
);
const AdminPanel = React.lazy(() =>
  import('./AdminPanel').then(module => ({ default: module.AdminPanel }))
);


const AdminLogin = React.lazy(() => import('./AdminLogin'));


const LoadingFallback = () => (
  <div className="flex justify-center items-center min-h-screen">
    <p>Ładowanie...</p>
  </div>
);

function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<AlabForm />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/panel" element={<AdminPanel />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;