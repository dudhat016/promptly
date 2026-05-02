import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LandingPage from './pages/LandingPage';
import ExplorePage from './pages/ExplorePage';
import PromptDetailPage from './pages/PromptDetailPage';
import DashboardPage from './pages/DashboardPage';
import PricingPage from './pages/PricingPage';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import AffiliatePage from './pages/AffiliatePage';
import ProfilePage from './pages/ProfilePage';
import PublicProfilePage from './pages/PublicProfilePage';
import Header from './components/Header';
import Footer from './components/Footer';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  return isAdmin ? <>{children}</> : <Navigate to="/" />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
          <Header />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/prompt/:id" element={<PromptDetailPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/affiliate" element={<AffiliatePage />} />
              <Route path="/user/:uid" element={<PublicProfilePage />} />
              <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
              <Route path="/settings" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
              <Route path="/billing" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
              <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
              <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}
