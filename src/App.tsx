import { useEffect } from 'react';
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
import AdminAffiliates from './pages/admin/AdminAffiliates';
import AdminBlog from './pages/admin/AdminBlog';
import AdminBlogForm from './pages/admin/AdminBlogForm';
import AdminCategories from './pages/admin/AdminCategories';
import AdminCategoryForm from './pages/admin/AdminCategoryForm';
import AdminEmails from './pages/admin/AdminEmails';
import AdminEmailSettings from './pages/admin/AdminEmailSettings';
import AdminFinancials from './pages/admin/AdminFinancials';
import AdminInquiries from './pages/admin/AdminInquiries';
import AdminLayout from './pages/admin/AdminLayout';
import AdminMarketing from './pages/admin/AdminMarketing';
import AdminMarketingContactDetails from './pages/admin/AdminMarketingContactDetails';
import AdminMarketingContactForm from './pages/admin/AdminMarketingContactForm';
import AdminMarketingTagForm from './pages/admin/AdminMarketingTagForm';
import AdminMarketingTagFormEdit from './pages/admin/AdminMarketingTagForm'; // Assuming this is correct based on surrounding context
import AdminMarketingAutomationForm from './pages/admin/AdminMarketingAutomationForm';
import AdminMarketingSegmentForm from './pages/admin/AdminMarketingSegmentForm';
import AdminModelForm from './pages/admin/AdminModelForm';
import AdminModels from './pages/admin/AdminModels';
import AdminOverview from './pages/admin/AdminOverview';
import AdminPermissions from './pages/admin/AdminPermissions';
import AdminRoles from './pages/admin/AdminRoles';
import AdminPromptForm from './pages/admin/AdminPromptForm';
import AdminPrompts from './pages/admin/AdminPrompts';
import AdminSEO from './pages/admin/AdminSEO';
import AdminSubscriptionForm from './pages/admin/AdminSubscriptionForm';
import AdminSubscriptions from './pages/admin/AdminSubscriptions';
import AdminTemplateForm from './pages/admin/AdminTemplateForm';
import AdminTemplates from './pages/admin/AdminTemplates';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserDetails from './pages/admin/AdminUserDetails';
import AdminTickets from './pages/admin/AdminTickets';
import AdminWithdrawals from './pages/admin/AdminWithdrawals';
import AdminSettings from './pages/admin/AdminSettings';
import AdminMedia from './pages/admin/AdminMedia';
import AdminActivityLog from './pages/admin/AdminActivityLog';
import AdminInvoices from './pages/admin/AdminInvoices';
import AdminInvoiceForm from './pages/admin/AdminInvoiceForm';
import AdminReports from './pages/admin/AdminReports';
import AffiliateInfoPage from './pages/AffiliateInfoPage';
import AffiliatePage from './pages/AffiliatePage';
import SupportPage from './pages/SupportPage';
import FAQPage from './pages/FAQPage';
import ForbiddenPage from './pages/error/ForbiddenPage';
import ServerErrorPage from './pages/error/ServerErrorPage';
import MaintenancePage from './pages/error/MaintenancePage';
import ComingSoonPage from './pages/error/ComingSoonPage';
import OnboardingPage from './pages/OnboardingPage';
import UsagePage from './pages/dashboard/UsagePage';
import AITwinStudioPage from './pages/dashboard/AITwinStudioPage';
import OnboardingGuard from './guards/OnboardingGuard';
import CookiePolicyPage from './pages/CookiePolicyPage';
import DMCAPage from './pages/DMCAPage';
import ChangelogPage from './pages/ChangelogPage';
import NotFoundPage from './pages/NotFoundPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import BlogDetailPage from './pages/BlogDetailPage';
import BlogPage from './pages/BlogPage';
import CheckoutPage from './pages/CheckoutPage';
import CheckoutVerifyPage from './pages/CheckoutVerifyPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';
import ContactPage from './pages/ContactPage';
import CreditHistoryPage from './pages/dashboard/CreditHistoryPage';
import DashboardFavorites from './pages/dashboard/DashboardFavorites';
import DashboardLibrary from './pages/dashboard/DashboardLibrary';
import SubmitPromptPage from './pages/dashboard/SubmitPromptPage';
import MyVaultPage from './pages/dashboard/MyVaultPage';
import ExplorePage from './pages/ExplorePage';
import LandingPage from './pages/LandingPage';
import PricingPage from './pages/PricingPage';
import PromptDetailPage from './pages/PromptDetailPage';
import AccountSettings from './pages/settings/AccountSettings';
import BillingSettings from './pages/settings/BillingSettings';
import NotificationSettings from './pages/settings/NotificationSettings';
import SecuritySettings from './pages/settings/SecuritySettings';
import AIIntegrationPage from './pages/settings/AIIntegrationPage';
import NotificationsPage from './pages/NotificationsPage';

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
    if (ref) localStorage.setItem('referralCode', ref.toUpperCase());
  }, [search]);
  return null;
}

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (profile?.role !== 'admin' && profile?.role !== 'staff') {
    return <Navigate to="/" replace />;
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
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
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
                  <Route path="affiliate" element={<AffiliateInfoPage />} />
                  <Route path="contact" element={<ContactPage />} />
                  <Route path="terms" element={<TermsPage />} />
                  <Route path="privacy" element={<PrivacyPage />} />
                  <Route path="cookies" element={<CookiePolicyPage />} />
                  <Route path="dmca" element={<DMCAPage />} />
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
                    <Route index element={<MyVaultPage />} />
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
                  </Route>
                  
                  <Route path="settings" element={<Outlet />}>
                    <Route index element={<Navigate to="profile" replace />} />
                    <Route path="profile" element={<AccountSettings />} />
                    <Route path="ai" element={<AIIntegrationPage />} />
                    <Route path="billing" element={<BillingSettings />} />
                    <Route path="security" element={<SecuritySettings />} />
                    <Route path="notifications" element={<NotificationSettings />} />
                  </Route>
                  <Route path="notifications" element={<NotificationsPage />} />
                </Route>
  
                <Route path="admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                  <Route index element={<AdminOverview />} />
                  <Route path="inquiries" element={<SectionRoute section="inquiries"><AdminInquiries /></SectionRoute>} />
                  <Route path="tickets" element={<SectionRoute section="tickets"><AdminTickets /></SectionRoute>} />
                  <Route path="reports" element={<SectionRoute section="reports"><AdminReports /></SectionRoute>} />
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
                  <Route path="templates" element={<SectionRoute section="templates"><AdminTemplates /></SectionRoute>} />
                  <Route path="templates/new" element={<SectionRoute section="templates"><AdminTemplateForm /></SectionRoute>} />
                  <Route path="templates/:id/edit" element={<SectionRoute section="templates"><AdminTemplateForm /></SectionRoute>} />
                  <Route path="blog" element={<SectionRoute section="blog"><AdminBlog /></SectionRoute>} />
                  <Route path="blog/new" element={<SectionRoute section="blog"><AdminBlogForm /></SectionRoute>} />
                  <Route path="blog/:id" element={<SectionRoute section="blog"><AdminBlogForm /></SectionRoute>} />
                  <Route path="subscriptions" element={<SectionRoute section="subscriptions"><AdminSubscriptions /></SectionRoute>} />
                  <Route path="subscriptions/new" element={<SectionRoute section="subscriptions"><AdminSubscriptionForm /></SectionRoute>} />
                  <Route path="subscriptions/:id/edit" element={<SectionRoute section="subscriptions"><AdminSubscriptionForm /></SectionRoute>} />
                  <Route path="referrals" element={<SectionRoute section="affiliates"><AdminAffiliates /></SectionRoute>} />
                  <Route path="withdrawals" element={<SectionRoute section="withdrawals"><AdminWithdrawals /></SectionRoute>} />
                  <Route path="revenue" element={<SectionRoute section="revenue"><AdminFinancials /></SectionRoute>} />
                  <Route path="emails" element={<SectionRoute section="emails"><AdminEmails /></SectionRoute>} />
                  <Route path="emails/settings" element={<SectionRoute section="emails"><AdminEmailSettings /></SectionRoute>} />
                  <Route path="settings/*" element={<SectionRoute section="settings"><AdminSettings /></SectionRoute>} />
                  <Route path="permissions" element={<SectionRoute section="permissions"><AdminPermissions /></SectionRoute>} />
                  <Route path="roles" element={<SectionRoute section="roles"><AdminRoles /></SectionRoute>} />
                  <Route path="activity" element={<SectionRoute section="activity"><AdminActivityLog /></SectionRoute>} />
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
