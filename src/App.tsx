import { collection, getDocs, increment, limit, query, updateDoc, where } from 'firebase/firestore';
import { lazy, Suspense, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Navigate, Outlet, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import { ConfirmProvider } from './components/admin';

import CookieConsent from './components/CookieConsent';
import Spinner from './components/feedback/Spinner';
import LanguageGuard from './components/LanguageGuard';
import CommandPalette from './components/navigation/CommandPalette';
import NeuralMarketingScripts from './components/NeuralMarketingScripts';
import OfflineBanner from './components/OfflineBanner';
import InstallPrompt from './components/pwa/InstallPrompt';
import SocialProofToaster from './components/SocialProofToaster';
import { useUI } from './contexts/UIProvider';
import DemoLayout from './demo/layout';
import OnboardingGuard from './guards/OnboardingGuard';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ConfigProvider, useConfig } from './hooks/useConfig';
import { usePath } from './hooks/usePath';
import { useStaffRoles } from './hooks/useStaffRoles';
import { ThemeProvider } from './hooks/useTheme';
import HorizontalLayout from './layouts/HorizontalLayout';
import { db } from './lib/firebase';
import AdminLayout from './pages/admin/AdminLayout';
import { AdminSection } from './types';

// ── Page lazy imports (code-split per route) ──────────────────────────────────
// Admin
const AdminBlog               = lazy(() => import('./pages/admin/AdminBlog'));
const AdminBlogCategories     = lazy(() => import('./pages/admin/AdminBlogCategories'));
const AdminBlogForm           = lazy(() => import('./pages/admin/AdminBlogForm'));
const AdminCategories         = lazy(() => import('./pages/admin/AdminCategories'));
const AdminCategoryForm       = lazy(() => import('./pages/admin/AdminCategoryForm'));
const AdminEmails             = lazy(() => import('./pages/admin/AdminEmails'));
const AdminEmailSettings      = lazy(() => import('./pages/admin/AdminEmailSettings'));
const AdminEmailLogs          = lazy(() => import('./pages/admin/AdminEmailLogs'));
const AdminEmailBroadcast     = lazy(() => import('./pages/admin/AdminEmailBroadcast'));
const AdminEmailAnalytics     = lazy(() => import('./pages/admin/AdminEmailAnalytics'));
const AdminAutomationInstances = lazy(() => import('./pages/admin/AdminAutomationInstances'));
const AdminInquiries          = lazy(() => import('./pages/admin/AdminInquiries'));
const AdminMarketing          = lazy(() => import('./pages/admin/AdminMarketing'));
const AdminMarketingContactDetails = lazy(() => import('./pages/admin/AdminMarketingContactDetails'));
const AdminMarketingContactForm    = lazy(() => import('./pages/admin/AdminMarketingContactForm'));
const AdminMarketingTagForm        = lazy(() => import('./pages/admin/AdminMarketingTagForm'));
const AdminMarketingAutomationForm = lazy(() => import('./pages/admin/AdminMarketingAutomationForm'));
const AdminMarketingSegmentForm    = lazy(() => import('./pages/admin/AdminMarketingSegmentForm'));
const AdminModelForm          = lazy(() => import('./pages/admin/AdminModelForm'));
const AdminModels             = lazy(() => import('./pages/admin/AdminModels'));
const AdminOverview           = lazy(() => import('./pages/admin/AdminOverview'));
const AdminPermissions        = lazy(() => import('./pages/admin/AdminPermissions'));
const AdminRoles              = lazy(() => import('./pages/admin/AdminRoles'));
const AdminRoleForm           = lazy(() => import('./pages/admin/AdminRoleForm'));
const AdminPromptForm         = lazy(() => import('./pages/admin/AdminPromptForm'));
const AdminPrompts            = lazy(() => import('./pages/admin/AdminPrompts'));
const AdminSEO                = lazy(() => import('./pages/admin/AdminSEO'));
const AdminTemplateForm       = lazy(() => import('./pages/admin/AdminTemplateForm'));
const AdminTemplates          = lazy(() => import('./pages/admin/AdminTemplates'));
const AdminUsers              = lazy(() => import('./pages/admin/AdminUsers'));
const AdminUserDetails        = lazy(() => import('./pages/admin/AdminUserDetails'));
const AdminTickets            = lazy(() => import('./pages/admin/AdminTickets'));
const AdminSettings           = lazy(() => import('./pages/admin/AdminSettings'));
const AdminNavigation         = lazy(() => import('./pages/admin/AdminNavigation'));
const AdminMedia              = lazy(() => import('./pages/admin/AdminMedia'));
const AdminActivityLog        = lazy(() => import('./pages/admin/AdminActivityLog'));

const AdminReports            = lazy(() => import('./pages/admin/AdminReports'));
const AdminTestimonials       = lazy(() => import('./pages/admin/AdminTestimonials'));



const AdminReviews            = lazy(() => import('./pages/admin/AdminReviews'));
// Public pages
const LandingPage             = lazy(() => import('./pages/LandingPage'));
const ExplorePage             = lazy(() => import('./pages/ExplorePage'));
const PromptDetailPage        = lazy(() => import('./pages/PromptDetailPage'));
const BlogPage                = lazy(() => import('./pages/BlogPage'));
const BlogDetailPage          = lazy(() => import('./pages/BlogDetailPage'));


const ContactPage             = lazy(() => import('./pages/ContactPage'));
const TermsPage               = lazy(() => import('./pages/TermsPage'));
const PrivacyPage             = lazy(() => import('./pages/PrivacyPage'));
const CookiePolicyPage        = lazy(() => import('./pages/CookiePolicyPage'));
const DMCAPage                = lazy(() => import('./pages/DMCAPage'));
const UnsubscribePage         = lazy(() => import('./pages/UnsubscribePage'));
const NewsletterConfirmPage   = lazy(() => import('./pages/NewsletterConfirmPage'));
const FAQPage                 = lazy(() => import('./pages/FAQPage'));
const SupportPage             = lazy(() => import('./pages/SupportPage'));
const NotFoundPage            = lazy(() => import('./pages/NotFoundPage'));
// Auth
const LoginPage               = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage            = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage      = lazy(() => import('./pages/auth/ForgotPasswordPage'));
// Error
const ForbiddenPage           = lazy(() => import('./pages/error/ForbiddenPage'));
const ServerErrorPage         = lazy(() => import('./pages/error/ServerErrorPage'));
const MaintenancePage         = lazy(() => import('./pages/error/MaintenancePage'));
const ComingSoonPage          = lazy(() => import('./pages/error/ComingSoonPage'));
const OnboardingPage          = lazy(() => import('./pages/OnboardingPage'));
// Dashboard
const DashboardPage           = lazy(() => import('./pages/DashboardPage'));
const DashboardFavorites      = lazy(() => import('./pages/dashboard/DashboardFavorites'));
const DashboardLibrary        = lazy(() => import('./pages/dashboard/DashboardLibrary'));
const SubmitPromptPage        = lazy(() => import('./pages/dashboard/SubmitPromptPage'));

const NotificationsPage       = lazy(() => import('./pages/NotificationsPage'));
const CollectionsPage         = lazy(() => import('./pages/dashboard/CollectionsPage'));
const CollectionDetailPage   = lazy(() => import('./pages/dashboard/CollectionDetailPage'));

// Settings
const AccountSettings         = lazy(() => import('./pages/settings/AccountSettings'));
const NotificationSettings    = lazy(() => import('./pages/settings/NotificationSettings'));
const SecuritySettings        = lazy(() => import('./pages/settings/SecuritySettings'));

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}


const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { profile, loading } = useAuth();
  const { prefix } = usePath();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size="xl" />
      </div>
    );
  }

  if (profile?.role !== 'admin' && profile?.role !== 'staff') {
    return <Navigate to={prefix('/')} replace />;
  }

  return <>{children}</>;
};

const SectionRoute = ({ section, children }: { section: AdminSection; children: React.ReactNode }) => {
  const { profile, loading: authLoading } = useAuth();
  const { canAccessSection, loading: rolesLoading } = useStaffRoles();
  const { prefix } = usePath();

  if (authLoading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size="xl" />
      </div>
    );
  }

  if (profile?.role === 'admin') return <>{children}</>;
  if (profile?.role === 'staff' && canAccessSection(section)) return <>{children}</>;

  return <Navigate to={prefix('/admin')} replace />;
};

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { prefix } = usePath();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={prefix('/login')} replace />;
  }

  return <>{children}</>;
};

const MaintenanceGuard = ({ children }: { children: React.ReactNode }) => {
  const { config, loading: configLoading } = useConfig();
  const { profile, loading: authLoading } = useAuth();
  const location = useLocation();

  if (configLoading || authLoading) return null;

  const isMaintenancePage = location.pathname.includes('/maintenance');
  const isAdminPath = location.pathname.includes('/admin');
  const isLoginPage = location.pathname.includes('/login');

  // Allow admins to see everything, and allow everyone to see the login page (for admins to log in)
  if (config?.maintenanceMode && profile?.role !== 'admin' && !isMaintenancePage && !isAdminPath && !isLoginPage) {
    return <Navigate to="/en/maintenance" replace />;
  }

  return <>{children}</>;
};

function AppContent() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="promptly-theme">
      <ConfigProvider>
        <AuthProvider>
          <ConfirmProvider>
            <NeuralMarketingScripts />
            <Router>
              <ScrollToTop />
              <Toaster position="top-center" />
              <SocialProofToaster />
              <OfflineBanner />
              <InstallPrompt />
              <CookieConsent />
              <CommandPalette />
              <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Navigate to="/en" replace />} />
                <Route path="/:lng" element={<LanguageGuard><MaintenanceGuard><Outlet /></MaintenanceGuard></LanguageGuard>}>
                  {/* Public Layout: Standard Header & Footer */}
                  <Route element={<HorizontalLayout />}>
                    <Route index element={<ExplorePage />} />
                    <Route path="explore/*" element={<Navigate to="/" replace />} />
                    <Route path="category/:id" element={<ExplorePage />} />
                  <Route path="prompt/:slug" element={<PromptDetailPage />} />
                  <Route path="blog" element={<BlogPage />} />
                  <Route path="blog/tag/:tagSlug" element={<BlogPage />} />
                  <Route path="blog/:slug" element={<BlogDetailPage />} />


                  <Route path="contact" element={<ContactPage />} />
                  <Route path="terms" element={<TermsPage />} />
                  <Route path="privacy" element={<PrivacyPage />} />
                  <Route path="cookies" element={<CookiePolicyPage />} />
                  <Route path="dmca" element={<DMCAPage />} />
                  <Route path="unsubscribe" element={<UnsubscribePage />} />
                  <Route path="newsletter/confirm" element={<NewsletterConfirmPage />} />
                  <Route path="faq" element={<FAQPage />} />
                  <Route path="403" element={<ForbiddenPage />} />
                  <Route path="500" element={<ServerErrorPage />} />
                  <Route path="maintenance" element={<MaintenancePage />} />
                  <Route path="coming-soon" element={<ComingSoonPage />} />

                  <Route path="login" element={<LoginPage />} />
                  <Route path="register" element={<RegisterPage />} />
                  <Route path="forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="onboarding" element={<PrivateRoute><OnboardingPage /></PrivateRoute>} />

                  <Route path="profile" element={<Navigate to="../settings/profile" replace />} />
                  <Route path="user/:id" element={<Navigate to="../admin/users/:id" replace />} />
                </Route>

                {/* Dashboard Layout: Sidebar + Specialized Header */}
                <Route element={<PrivateRoute><OnboardingGuard><DemoLayout /></OnboardingGuard></PrivateRoute>}>
                  <Route path="dashboard" element={<Outlet />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="favorites" element={<DashboardFavorites />} />
                    <Route path="library" element={<Outlet />}>
                      <Route index element={<DashboardLibrary />} />
                      <Route path="submit" element={<SubmitPromptPage />} />
                    </Route>

                    <Route path="support" element={<SupportPage />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                    <Route path="collections" element={<CollectionsPage />} />
                    <Route path="collections/:id" element={<CollectionDetailPage />} />

                  </Route>

                  <Route path="settings" element={<Outlet />}>
                    <Route index element={<Navigate to="profile" replace />} />
                    <Route path="profile" element={<AccountSettings />} />
                    <Route path="security" element={<SecuritySettings />} />
                    <Route path="notifications" element={<NotificationSettings />} />
                  </Route>
                </Route>

                <Route path="admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                  <Route index element={<AdminOverview />} />
                  <Route path="inquiries" element={<SectionRoute section="inquiries"><AdminInquiries /></SectionRoute>} />
                  <Route path="tickets" element={<SectionRoute section="tickets"><AdminTickets /></SectionRoute>} />
                  <Route path="reports" element={<SectionRoute section="reports"><AdminReports /></SectionRoute>} />
                  <Route path="reviews" element={<SectionRoute section="reviews"><AdminReviews /></SectionRoute>} />
                  <Route path="testimonials" element={<SectionRoute section="content"><AdminTestimonials /></SectionRoute>} />
                  <Route path="prompts" element={<SectionRoute section="prompts"><AdminPrompts /></SectionRoute>} />
                  <Route path="seo" element={<SectionRoute section="seo"><AdminSEO /></SectionRoute>} />
                  <Route path="prompts/new" element={<SectionRoute section="prompts"><AdminPromptForm /></SectionRoute>} />
                  <Route path="prompts/:id/edit" element={<SectionRoute section="prompts"><AdminPromptForm /></SectionRoute>} />
                  <Route path="categories" element={<SectionRoute section="categories"><AdminCategories /></SectionRoute>} />
                  <Route path="categories/new" element={<SectionRoute section="categories"><AdminCategoryForm /></SectionRoute>} />
                  <Route path="categories/:id/edit" element={<SectionRoute section="categories"><AdminCategoryForm /></SectionRoute>} />
                  <Route path="users" element={<SectionRoute section="users"><AdminUsers /></SectionRoute>} />
                  <Route path="users/:id" element={<SectionRoute section="users"><AdminUserDetails /></SectionRoute>} />
                  <Route path="models" element={<SectionRoute section="ai_models"><AdminModels /></SectionRoute>} />
                  <Route path="models/new" element={<SectionRoute section="ai_models"><AdminModelForm /></SectionRoute>} />
                  <Route path="models/:id/edit" element={<SectionRoute section="ai_models"><AdminModelForm /></SectionRoute>} />
                  <Route path="marketing" element={<SectionRoute section="marketing"><AdminMarketing /></SectionRoute>} />
                  <Route path="marketing/contacts" element={<SectionRoute section="marketing"><AdminMarketing /></SectionRoute>} />
                  <Route path="marketing/contacts/:id" element={<SectionRoute section="marketing"><AdminMarketingContactDetails /></SectionRoute>} />
                  <Route path="marketing/tags" element={<SectionRoute section="marketing"><AdminMarketing /></SectionRoute>} />
                  <Route path="marketing/segments" element={<SectionRoute section="marketing"><AdminMarketing /></SectionRoute>} />
                  <Route path="marketing/automations" element={<SectionRoute section="marketing"><AdminMarketing /></SectionRoute>} />
                  <Route path="marketing/contacts/new" element={<SectionRoute section="marketing"><AdminMarketingContactForm /></SectionRoute>} />
                  <Route path="marketing/contacts/:id/edit" element={<SectionRoute section="marketing"><AdminMarketingContactForm /></SectionRoute>} />
                  <Route path="marketing/tags/new" element={<SectionRoute section="marketing"><AdminMarketingTagForm /></SectionRoute>} />
                  <Route path="marketing/tags/:id/edit" element={<SectionRoute section="marketing"><AdminMarketingTagForm /></SectionRoute>} />
                  <Route path="marketing/automations/new" element={<SectionRoute section="marketing"><AdminMarketingAutomationForm /></SectionRoute>} />
                  <Route path="marketing/automations/:id/edit" element={<SectionRoute section="marketing"><AdminMarketingAutomationForm /></SectionRoute>} />
                  <Route path="marketing/segments/new" element={<SectionRoute section="marketing"><AdminMarketingSegmentForm /></SectionRoute>} />
                  <Route path="marketing/segments/:id/edit" element={<SectionRoute section="marketing"><AdminMarketingSegmentForm /></SectionRoute>} />
                  <Route path="emails/templates" element={<SectionRoute section="emails"><AdminTemplates /></SectionRoute>} />
                  <Route path="emails/templates/new" element={<SectionRoute section="emails"><AdminTemplateForm /></SectionRoute>} />
                  <Route path="emails/templates/:id/edit" element={<SectionRoute section="emails"><AdminTemplateForm /></SectionRoute>} />
                  <Route path="blog" element={<SectionRoute section="blog"><AdminBlog /></SectionRoute>} />
                  <Route path="blog/categories" element={<SectionRoute section="blog"><AdminBlogCategories /></SectionRoute>} />
                  <Route path="blog/new" element={<SectionRoute section="blog"><AdminBlogForm /></SectionRoute>} />
                  <Route path="blog/:id" element={<SectionRoute section="blog"><AdminBlogForm /></SectionRoute>} />
                  <Route path="emails" element={<SectionRoute section="emails"><AdminEmails /></SectionRoute>} />
                  <Route path="emails/logs" element={<SectionRoute section="emails"><AdminEmailLogs /></SectionRoute>} />
                  <Route path="emails/automation" element={<SectionRoute section="emails"><AdminAutomationInstances /></SectionRoute>} />
                  <Route path="emails/broadcast" element={<SectionRoute section="emails"><AdminEmailBroadcast /></SectionRoute>} />
                  <Route path="emails/analytics" element={<SectionRoute section="emails"><AdminEmailAnalytics /></SectionRoute>} />
                  <Route path="emails/settings" element={<SectionRoute section="emails"><AdminEmailSettings /></SectionRoute>} />
                  <Route path="settings/menu" element={<SectionRoute section="settings"><AdminNavigation /></SectionRoute>} />
                  <Route path="settings/*" element={<SectionRoute section="settings"><AdminSettings /></SectionRoute>} />
                  <Route path="permissions" element={<SectionRoute section="permissions"><AdminPermissions /></SectionRoute>} />
                  <Route path="roles" element={<SectionRoute section="roles"><AdminRoles /></SectionRoute>} />
                  <Route path="roles/new" element={<SectionRoute section="roles"><AdminRoleForm /></SectionRoute>} />
                  <Route path="roles/:id" element={<SectionRoute section="roles"><AdminRoleForm /></SectionRoute>} />



                  <Route path="activity" element={<SectionRoute section="activity"><AdminActivityLog /></SectionRoute>} />

                  <Route path="media" element={<SectionRoute section="media"><AdminMedia /></SectionRoute>} />
                </Route>

                  <Route path="*" element={<NotFoundPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/en" replace />} />
              </Routes>
              </Suspense>
            </Router>
            </ConfirmProvider>
          </AuthProvider>
      </ConfigProvider>
    </ThemeProvider>
  );
}

function App() {
  return <AppContent />;
}

export default App;
