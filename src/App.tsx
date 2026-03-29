import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import EvaluatorLogin from './pages/EvaluatorLogin';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const isEvaluator = localStorage.getItem('evaluatorMode') === 'true';
  const activeUser = user || (isEvaluator ? { uid: 'evaluator', email: 'evaluator@hackathon.local', isAnonymous: true } : null);

  return (
    <Router>
      <Routes>
        <Route path="/" element={activeUser ? <Navigate to="/dashboard" /> : <LandingPage />} />
        <Route path="/evaluator-login" element={activeUser ? <Navigate to="/dashboard" /> : <EvaluatorLogin />} />
        <Route path="/dashboard/*" element={activeUser ? <Dashboard user={activeUser} /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
