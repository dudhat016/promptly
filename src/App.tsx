import { lazy, Suspense, useEffect } from 'react';
import { collection, getDocs, increment, limit, query, updateDoc, where } from 'firebase/firestore';
import { db } from './lib/firebase';
import { Toaster } from 'react-hot-toast';
import { Navigate, Outlet, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import Footer from './components/Footer';
import Header from './components/Header';
import SocialProofToaster from './components/SocialProofToaster';
import NeuralMarketingScripts from './components/NeuralMarketingScripts';
import CookieConsent from './components/CookieConsent';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useStaffRoles } from './hooks/useStaffRoles';
import { usePath } from './hooks/usePath';
import { AdminSection } from './types';
import { useConfig, ConfigProvider } from './hooks/useConfig';
import { useUI } from './contexts/UIProvider';
import { ConfirmProvider } from './components/admin';
import { ThemeProvider } from './hooks/useTheme';
import { CurrencyProvider } from './context/CurrencyContext';
import { CustomizerDrawer } from './components/overlays';
import InstallPrompt from './components/pwa/InstallPrompt';
import LanguageGuard from './components/LanguageGuard';
import CommandPalette from './components/navigation/CommandPalette';
import ReferralModal from './components/marketing/ReferralModal';
import ConversionTracking from './components/ConversionTracking';
import UserLayout from './layouts/UserLayout';
import HorizontalLayout from './layouts/HorizontalLayout';
import AdminLayout from './pages/admin/AdminLayout';
import OnboardingGuard from './guards/OnboardingGuard';

// ── Page lazy imports (code-split per route) ──────────────────────────────────
// Admin
const AdminAffiliates         = lazy(() => import('./pages/admin/AdminAffiliates'));
const AdminAssetManager       = lazy(() => import('./pages/admin/AdminAssetManager'));
const AdminBlog               = lazy(() => import('./pages/admin/AdminBlog'));
const AdminBlogCategories     = lazy(() => import('./pages/admin/AdminBlogCategories'));
const AdminBlogForm           = lazy(() => import('./pages/admin/AdminBlogForm'));
const AdminSitePages          = lazy(() => import('./pages/admin/AdminSitePages'));
const AdminCategories         = lazy(() => import('./pages/admin/AdminCategories'));
const AdminCategoryForm       = lazy(() => import('./pages/admin/AdminCategoryForm'));
const AdminEmails             = lazy(() => import('./pages/admin/AdminEmails'));
const AdminEmailSettings      = lazy(() => import('./pages/admin/AdminEmailSettings'));
const AdminEmailLogs          = lazy(() => import('./pages/admin/AdminEmailLogs'));
const AdminEmailBroadcast     = lazy(() => import('./pages/admin/AdminEmailBroadcast'));
const AdminEmailAnalytics     = lazy(() => import('./pages/admin/AdminEmailAnalytics'));
const AdminAutomationInstances = lazy(() => import('./pages/admin/AdminAutomationInstances'));
const AdminFinancials         = lazy(() => import('./pages/admin/AdminFinancials'));
const AdminOrders             = lazy(() => import('./pages/admin/AdminOrders'));
const AdminCoupons            = lazy(() => import('./pages/admin/AdminCoupons'));
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
const AdminSubscriptionForm   = lazy(() => import('./pages/admin/AdminSubscriptionForm'));
const AdminSubscriptions      = lazy(() => import('./pages/admin/AdminSubscriptions'));
const AdminTemplateForm       = lazy(() => import('./pages/admin/AdminTemplateForm'));
const AdminTemplates          = lazy(() => import('./pages/admin/AdminTemplates'));
const AdminUsers              = lazy(() => import('./pages/admin/AdminUsers'));
const AdminUserDetails        = lazy(() => import('./pages/admin/AdminUserDetails'));
const AdminTickets            = lazy(() => import('./pages/admin/AdminTickets'));
const AdminWithdrawals        = lazy(() => import('./pages/admin/AdminWithdrawals'));
const AdminSettings           = lazy(() => import('./pages/admin/AdminSettings'));
const AdminMedia              = lazy(() => import('./pages/admin/AdminMedia'));
const AdminActivityLog        = lazy(() => import('./pages/admin/AdminActivityLog'));
const AdminSystemHealth       = lazy(() => import('./pages/admin/AdminSystemHealth'));
const AdminInvoices           = lazy(() => import('./pages/admin/AdminInvoices'));
const AdminInvoiceForm        = lazy(() => import('./pages/admin/AdminInvoiceForm'));
const AdminReports            = lazy(() => import('./pages/admin/AdminReports'));
const AdminTestimonials       = lazy(() => import('./pages/admin/AdminTestimonials'));
const AdminChangelog          = lazy(() => import('./pages/admin/AdminChangelog'));
const AdminBadges             = lazy(() => import('./pages/admin/AdminBadges'));
const AdminBadgeForm          = lazy(() => import('./pages/admin/AdminBadgeForm'));
const AdminChurn              = lazy(() => import('./pages/admin/AdminChurn'));
const AdminReviews            = lazy(() => import('./pages/admin/AdminReviews'));
// Public pages
const LandingPage             = lazy(() => import('./pages/LandingPage'));
const ExplorePage             = lazy(() => import('./pages/ExplorePage'));
const PromptDetailPage        = lazy(() => import('./pages/PromptDetailPage'));
const PricingPage             = lazy(() => import('./pages/PricingPage'));
const BlogPage                = lazy(() => import('./pages/BlogPage'));
const BlogDetailPage          = lazy(() => import('./pages/BlogDetailPage'));
const PublicProfilePage       = lazy(() => import('./pages/PublicProfilePage'));
const AffiliateInfoPage       = lazy(() => import('./pages/AffiliateInfoPage'));
const LeaderboardPage         = lazy(() => import('./pages/LeaderboardPage'));
const ContactPage             = lazy(() => import('./pages/ContactPage'));
const TermsPage               = lazy(() => import('./pages/TermsPage'));
const PrivacyPage             = lazy(() => import('./pages/PrivacyPage'));
const CookiePolicyPage        = lazy(() => import('./pages/CookiePolicyPage'));
const DMCAPage                = lazy(() => import('./pages/DMCAPage'));
const UnsubscribePage         = lazy(() => import('./pages/UnsubscribePage'));
const NewsletterConfirmPage   = lazy(() => import('./pages/NewsletterConfirmPage'));
const FAQPage                 = lazy(() => import('./pages/FAQPage'));
const ChangelogPage           = lazy(() => import('./pages/ChangelogPage'));
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
// Checkout / onboarding
const CheckoutPage            = lazy(() => import('./pages/CheckoutPage'));
const CheckoutVerifyPage      = lazy(() => import('./pages/CheckoutVerifyPage'));
const CheckoutSuccessPage     = lazy(() => import('./pages/CheckoutSuccessPage'));
const OnboardingPage          = lazy(() => import('./pages/OnboardingPage'));
// Dashboard
const DashboardPage           = lazy(() => import('./pages/DashboardPage'));
const MyVaultPage             = lazy(() => import('./pages/dashboard/MyVaultPage'));
const DashboardFavorites      = lazy(() => import('./pages/dashboard/DashboardFavorites'));
const DashboardLibrary        = lazy(() => import('./pages/dashboard/DashboardLibrary'));
const SubmitPromptPage        = lazy(() => import('./pages/dashboard/SubmitPromptPage'));
const CreditHistoryPage       = lazy(() => import('./pages/dashboard/CreditHistoryPage'));
const AITwinStudioPage        = lazy(() => import('./pages/dashboard/AITwinStudioPage'));
const UsagePage               = lazy(() => import('./pages/dashboard/UsagePage'));
const AffiliatePage           = lazy(() => import('./pages/AffiliatePage'));
const NotificationsPage       = lazy(() => import('./pages/NotificationsPage'));
const CollectionsPage         = lazy(() => import('./pages/dashboard/CollectionsPage'));
const SavedPromptsPage        = lazy(() => import('./pages/dashboard/SavedPromptsPage'));
// Settings
const AccountSettings         = lazy(() => import('./pages/settings/AccountSettings'));
const BillingSettings         = lazy(() => import('./pages/settings/BillingSettings'));
const NotificationSettings    = lazy(() => import('./pages/settings/NotificationSettings'));
const SecuritySettings        = lazy(() => import('./pages/settings/SecuritySettings'));
const AIIntegrationPage       = lazy(() => import('./pages/settings/AIIntegrationPage'));

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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

function ReferralCapture() {
  const { search } = useLocation();
  useEffect(() => {
    const ref = new URLSearchParams(search).get('ref');
    if (!ref) return;
    const code = ref.toUpperCase();
    localStorage.setItem('referralCode', code);
    // Increment click counter on the referrer's user doc (fire-and-forget)
    const snap = query(collection(db, 'users'), where('referralCode', '==', code), limit(1));
    getDocs(snap).then(s => {
      if (!s.empty) updateDoc(s.docs[0].ref, { referralClicks: increment(1) }).catch(() => {});
    }).catch(() => {});
  }, [search]);
  return null;
}

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { profile, loading } = useAuth();
  const { prefix } = usePath();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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
  const { isReferralModalOpen, setReferralModalOpen } = useUI();
  
  return (
    <ThemeProvider defaultTheme="light" storageKey="promptly-theme">
      <ConfigProvider>
        <CurrencyProvider>
          <AuthProvider>
            <ConfirmProvider>
            <NeuralMarketingScripts />
            <Router>
              <ScrollToTop />
              <ReferralCapture />
              <Toaster position="top-center" />
              <SocialProofToaster />
              <CustomizerDrawer />
              <InstallPrompt />
              <CookieConsent />
              <CommandPalette />
              <ConversionTracking />
              <ReferralModal 
                isOpen={isReferralModalOpen} 
                onClose={() => setReferralModalOpen(false)} 
              />
              <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Navigate to="/en" replace />} />
                <Route path="/:lng" element={<LanguageGuard><MaintenanceGuard><Outlet /></MaintenanceGuard></LanguageGuard>}>
                  {/* Public Layout: Standard Header & Footer */}
                  <Route element={<HorizontalLayout />}>
                    <Route index element={<LandingPage />} />
                  <Route path="explore/*" element={<ExplorePage />} />
                  <Route path="category/:id" element={<ExplorePage />} />
                  <Route path="prompt/:slug" element={<PromptDetailPage />} />
                  <Route path="pricing" element={<PricingPage />} />
                  <Route path="blog" element={<BlogPage />} />
                  <Route path="blog/tag/:tagSlug" element={<BlogPage />} />
                  <Route path="blog/:slug" element={<BlogDetailPage />} />
                  <Route path="creator/:uid" element={<PublicProfilePage />} />
                  <Route path="affiliate" element={<AffiliateInfoPage />} />
                  <Route path="leaderboard" element={<LeaderboardPage />} />
                  <Route path="contact" element={<ContactPage />} />
                  <Route path="terms" element={<TermsPage />} />
                  <Route path="privacy" element={<PrivacyPage />} />
                  <Route path="cookies" element={<CookiePolicyPage />} />
                  <Route path="dmca" element={<DMCAPage />} />
                  <Route path="unsubscribe" element={<UnsubscribePage />} />
                  <Route path="newsletter/confirm" element={<NewsletterConfirmPage />} />
                  <Route path="faq" element={<FAQPage />} />
                  <Route path="changelog" element={<ChangelogPage />} />
                  <Route path="403" element={<ForbiddenPage />} />
                  <Route path="500" element={<ServerErrorPage />} />
                  <Route path="maintenance" element={<MaintenancePage />} />
                  <Route path="coming-soon" element={<ComingSoonPage />} />

                  <Route path="login" element={<LoginPage />} />
                  <Route path="register" element={<RegisterPage />} />
                  <Route path="forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="checkout" element={<CheckoutPage />} />
                  <Route path="checkout/verify" element={<CheckoutVerifyPage />} />
                  <Route path="checkout/success" element={<CheckoutSuccessPage />} />
                  <Route path="onboarding" element={<PrivateRoute><OnboardingPage /></PrivateRoute>} />
  
                  <Route path="profile" element={<Navigate to="../settings/profile" replace />} />
                  <Route path="user/:id" element={<Navigate to="../admin/users/:id" replace />} />
                  <Route path="billing" element={<Navigate to="../settings/billing" replace />} />
                </Route>
  
                {/* Dashboard Layout: Sidebar + Specialized Header */}
                <Route element={<PrivateRoute><OnboardingGuard><UserLayout /></OnboardingGuard></PrivateRoute>}>
                  <Route path="dashboard" element={<Outlet />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="vault" element={<MyVaultPage />} />
                    <Route path="favorites" element={<DashboardFavorites />} />
                    <Route path="library" element={<Outlet />}>
                      <Route index element={<DashboardLibrary />} />
                      <Route path="submit" element={<SubmitPromptPage />} />
                    </Route>
                    <Route path="credits" element={<CreditHistoryPage />} />
                    <Route path="twin-studio" element={<AITwinStudioPage />} />
                    <Route path="usage" element={<UsagePage />} />
                    <Route path="affiliate" element={<AffiliatePage />} />
                    <Route path="support" element={<SupportPage />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                    <Route path="collections" element={<CollectionsPage />} />
                    <Route path="saved" element={<SavedPromptsPage />} />
                  </Route>

                  <Route path="settings" element={<Outlet />}>
                    <Route index element={<Navigate to="profile" replace />} />
                    <Route path="profile" element={<AccountSettings />} />
                    <Route path="ai" element={<AIIntegrationPage />} />
                    <Route path="billing" element={<BillingSettings />} />
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
                  <Route path="changelog" element={<SectionRoute section="content"><AdminChangelog /></SectionRoute>} />
                  <Route path="churn" element={<SectionRoute section="revenue"><AdminChurn /></SectionRoute>} />
                  <Route path="prompts" element={<SectionRoute section="prompts"><AdminPrompts /></SectionRoute>} />
                  <Route path="seo" element={<SectionRoute section="seo"><AdminSEO /></SectionRoute>} />
                  <Route path="prompts/new" element={<SectionRoute section="prompts"><AdminPromptForm /></SectionRoute>} />
                  <Route path="prompts/:id/edit" element={<SectionRoute section="prompts"><AdminPromptForm /></SectionRoute>} />
                  <Route path="categories" element={<SectionRoute section="categories"><AdminCategories /></SectionRoute>} />
                  <Route path="categories/new" element={<SectionRoute section="categories"><AdminCategoryForm /></SectionRoute>} />
                  <Route path="categories/:id/edit" element={<SectionRoute section="categories"><AdminCategoryForm /></SectionRoute>} />
                  <Route path="users" element={<SectionRoute section="users"><AdminUsers /></SectionRoute>} />
                  <Route path="users/:id" element={<SectionRoute section="users"><AdminUserDetails /></SectionRoute>} />
                  <Route path="badges" element={<SectionRoute section="badges"><AdminBadges /></SectionRoute>} />
                  <Route path="badges/new" element={<SectionRoute section="badges"><AdminBadgeForm /></SectionRoute>} />
                  <Route path="badges/:id/edit" element={<SectionRoute section="badges"><AdminBadgeForm /></SectionRoute>} />
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
                  <Route path="assets" element={<SectionRoute section="settings"><AdminAssetManager /></SectionRoute>} />
                  <Route path="site-pages" element={<SectionRoute section="content"><AdminSitePages /></SectionRoute>} />
                  <Route path="blog" element={<SectionRoute section="blog"><AdminBlog /></SectionRoute>} />
                  <Route path="blog/categories" element={<SectionRoute section="blog"><AdminBlogCategories /></SectionRoute>} />
                  <Route path="blog/new" element={<SectionRoute section="blog"><AdminBlogForm /></SectionRoute>} />
                  <Route path="blog/:id" element={<SectionRoute section="blog"><AdminBlogForm /></SectionRoute>} />
                  <Route path="subscriptions" element={<SectionRoute section="subscriptions"><AdminSubscriptions /></SectionRoute>} />
                  <Route path="subscriptions/new" element={<SectionRoute section="subscriptions"><AdminSubscriptionForm /></SectionRoute>} />
                  <Route path="subscriptions/:id/edit" element={<SectionRoute section="subscriptions"><AdminSubscriptionForm /></SectionRoute>} />
                  <Route path="referrals" element={<SectionRoute section="affiliates"><AdminAffiliates /></SectionRoute>} />
                  <Route path="withdrawals" element={<SectionRoute section="withdrawals"><AdminWithdrawals /></SectionRoute>} />
                  <Route path="revenue" element={<SectionRoute section="revenue"><AdminFinancials /></SectionRoute>} />
                  <Route path="orders" element={<SectionRoute section="revenue"><AdminOrders /></SectionRoute>} />
                  <Route path="coupons" element={<SectionRoute section="revenue"><AdminCoupons /></SectionRoute>} />
                  <Route path="emails" element={<SectionRoute section="emails"><AdminEmails /></SectionRoute>} />
                  <Route path="emails/logs" element={<SectionRoute section="emails"><AdminEmailLogs /></SectionRoute>} />
                  <Route path="emails/automation" element={<SectionRoute section="emails"><AdminAutomationInstances /></SectionRoute>} />
                  <Route path="emails/broadcast" element={<SectionRoute section="emails"><AdminEmailBroadcast /></SectionRoute>} />
                  <Route path="emails/analytics" element={<SectionRoute section="emails"><AdminEmailAnalytics /></SectionRoute>} />
                  <Route path="emails/settings" element={<SectionRoute section="emails"><AdminEmailSettings /></SectionRoute>} />
                  <Route path="settings/*" element={<SectionRoute section="settings"><AdminSettings /></SectionRoute>} />
                  <Route path="permissions" element={<SectionRoute section="permissions"><AdminPermissions /></SectionRoute>} />
                  <Route path="roles" element={<SectionRoute section="roles"><AdminRoles /></SectionRoute>} />
                  <Route path="roles/new" element={<SectionRoute section="roles"><AdminRoleForm /></SectionRoute>} />
                  <Route path="roles/:id" element={<SectionRoute section="roles"><AdminRoleForm /></SectionRoute>} />
                  <Route path="activity" element={<SectionRoute section="activity"><AdminActivityLog /></SectionRoute>} />
                  <Route path="system"   element={<SectionRoute section="settings"><AdminSystemHealth /></SectionRoute>} />
                  <Route path="media" element={<SectionRoute section="media"><AdminMedia /></SectionRoute>} />
                  <Route path="invoices" element={<SectionRoute section="revenue"><AdminInvoices /></SectionRoute>} />
                  <Route path="invoices/new" element={<SectionRoute section="revenue"><AdminInvoiceForm /></SectionRoute>} />
                  <Route path="invoices/:id" element={<SectionRoute section="revenue"><AdminInvoiceForm /></SectionRoute>} />
                  <Route path="invoices/:id/edit" element={<SectionRoute section="revenue"><AdminInvoiceForm /></SectionRoute>} />
                </Route>
  
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/en" replace />} />
              </Routes>
              </Suspense>
            </Router>
            </ConfirmProvider>
          </AuthProvider>
        </CurrencyProvider>
      </ConfigProvider>
    </ThemeProvider>
  );
}

function App() {
  return <AppContent />;
}

export default App;
