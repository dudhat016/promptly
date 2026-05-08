import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Navigate, Outlet, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import Footer from './components/Footer';
import Header from './components/Header';
import SocialProofToaster from './components/SocialProofToaster';
import NeuralMarketingScripts from './components/NeuralMarketingScripts';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ConfirmProvider } from './components/admin';
import { ThemeProvider } from './hooks/useTheme';
import { ConfigProvider } from './hooks/useConfig';
import { CurrencyProvider } from './context/CurrencyContext';
import UserLayout from './layouts/UserLayout';
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
import AdminPromptForm from './pages/admin/AdminPromptForm';
import AdminPrompts from './pages/admin/AdminPrompts';
import AdminSEO from './pages/admin/AdminSEO';
import AdminSitePages from './pages/admin/AdminSitePages';
import AdminSubscriptionForm from './pages/admin/AdminSubscriptionForm';
import AdminSubscriptions from './pages/admin/AdminSubscriptions';
import AdminTemplateForm from './pages/admin/AdminTemplateForm';
import AdminTemplates from './pages/admin/AdminTemplates';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserDetails from './pages/admin/AdminUserDetails';
import AdminTickets from './pages/admin/AdminTickets';
import AdminWithdrawals from './pages/admin/AdminWithdrawals';
import AdminSettings from './pages/admin/AdminSettings';
import AdminActivityLog from './pages/admin/AdminActivityLog';
import AffiliateInfoPage from './pages/AffiliateInfoPage';
import AffiliatePage from './pages/AffiliatePage';
import SupportPage from './pages/SupportPage';
import CookiePolicyPage from './pages/CookiePolicyPage';
import DMCAPage from './pages/DMCAPage';
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
import DashboardBuilder from './pages/dashboard/DashboardBuilder';
import DashboardFavorites from './pages/dashboard/DashboardFavorites';
import DashboardLibrary from './pages/dashboard/DashboardLibrary';
import MyVaultPage from './pages/dashboard/MyVaultPage';
import ExplorePage from './pages/ExplorePage';
import LandingPage from './pages/LandingPage';
import PricingPage from './pages/PricingPage';
import PromptDetailPage from './pages/PromptDetailPage';
import AccountSettings from './pages/settings/AccountSettings';
import BillingSettings from './pages/settings/BillingSettings';
import NotificationSettings from './pages/settings/NotificationSettings';
import SecuritySettings from './pages/settings/SecuritySettings';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (profile?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
};

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="promptly-theme">
      <ConfigProvider>
        <CurrencyProvider>
          <AuthProvider>
            <ConfirmProvider>
            <NeuralMarketingScripts />
            <Router>
              <ScrollToTop />
              <Toaster position="top-center" />
              <SocialProofToaster />
              <Routes>
                {/* Public Layout: Standard Header & Footer */}
                <Route element={<><Header /><Outlet /><Footer /></>}>
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
                  
                  <Route path="login" element={<LoginPage />} />
                  <Route path="register" element={<RegisterPage />} />
                  <Route path="forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="checkout" element={<CheckoutPage />} />
                  <Route path="checkout/verify" element={<CheckoutVerifyPage />} />
                  <Route path="checkout/success" element={<CheckoutSuccessPage />} />
  
                  <Route path="profile" element={<Navigate to="/settings/profile" replace />} />
                  <Route path="user/:id" element={<Navigate to="/admin/users/:id" replace />} />
                  <Route path="billing" element={<Navigate to="/settings/billing" replace />} />
                </Route>
  
                {/* Dashboard Layout: Sidebar + Specialized Header */}
                <Route element={<PrivateRoute><UserLayout /></PrivateRoute>}>
                  <Route path="dashboard" element={<MyVaultPage />} />
                  <Route path="dashboard/favorites" element={<DashboardFavorites />} />
                  <Route path="dashboard/library" element={<DashboardLibrary />} />
                  <Route path="vault" element={<MyVaultPage />} />
                  <Route path="credits" element={<CreditHistoryPage />} />
                  <Route path="builder" element={<DashboardBuilder />} />
                  <Route path="affiliate/dashboard" element={<AffiliatePage />} />
                  <Route path="support" element={<SupportPage />} />
                  
                  <Route path="settings" element={<Outlet />}>
                    <Route index element={<Navigate to="profile" replace />} />
                    <Route path="profile" element={<AccountSettings />} />
                    <Route path="billing" element={<BillingSettings />} />
                    <Route path="security" element={<SecuritySettings />} />
                    <Route path="notifications" element={<NotificationSettings />} />
                  </Route>
                </Route>
  
                <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                  <Route index element={<AdminOverview />} />
                  <Route path="inquiries" element={<AdminInquiries />} />
                  <Route path="tickets" element={<AdminTickets />} />
                  <Route path="prompts" element={<AdminPrompts />} />
                  <Route path="seo" element={<AdminSEO />} />
                  <Route path="site-pages" element={<AdminSitePages />} />
                  <Route path="prompts/new" element={<AdminPromptForm />} />
                  <Route path="prompts/edit/:id" element={<AdminPromptForm />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="categories/new" element={<AdminCategoryForm />} />
                  <Route path="categories/edit/:id" element={<AdminCategoryForm />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="users/:id" element={<AdminUserDetails />} />
                  <Route path="models" element={<AdminModels />} />
                  <Route path="models/new" element={<AdminModelForm />} />
                  <Route path="models/edit/:id" element={<AdminModelForm />} />
                  <Route path="marketing" element={<AdminMarketing />} />
                  <Route path="marketing/contacts" element={<AdminMarketing />} />
                  <Route path="marketing/contacts/:id" element={<AdminMarketingContactDetails />} />
                  <Route path="marketing/tags" element={<AdminMarketing />} />
                  <Route path="marketing/segments" element={<AdminMarketing />} />
                  <Route path="marketing/automations" element={<AdminMarketing />} />
                  <Route path="marketing/contacts/new" element={<AdminMarketingContactForm />} />
                  <Route path="marketing/contacts/edit/:id" element={<AdminMarketingContactForm />} />
                  <Route path="marketing/tags/new" element={<AdminMarketingTagForm />} />
                  <Route path="marketing/tags/edit/:id" element={<AdminMarketingTagForm />} />
                  <Route path="marketing/automations/new" element={<AdminMarketingAutomationForm />} />
                  <Route path="marketing/automations/edit/:id" element={<AdminMarketingAutomationForm />} />
                  <Route path="marketing/segments/new" element={<AdminMarketingSegmentForm />} />
                  <Route path="marketing/segments/edit/:id" element={<AdminMarketingSegmentForm />} />
                  <Route path="templates" element={<AdminTemplates />} />
                  <Route path="templates/new" element={<AdminTemplateForm />} />
                  <Route path="templates/edit/:id" element={<AdminTemplateForm />} />
                  <Route path="blog" element={<AdminBlog />} />
                  <Route path="blog/new" element={<AdminBlogForm />} />
                  <Route path="blog/:id" element={<AdminBlogForm />} />
                  <Route path="subscriptions" element={<AdminSubscriptions />} />
                  <Route path="subscriptions/new" element={<AdminSubscriptionForm />} />
                  <Route path="subscriptions/edit/:id" element={<AdminSubscriptionForm />} />
                  <Route path="referrals" element={<AdminAffiliates />} />
                  <Route path="withdrawals" element={<AdminWithdrawals />} />
                  <Route path="revenue" element={<AdminFinancials />} />
                  <Route path="emails" element={<AdminEmails />} />
                  <Route path="emails/settings" element={<AdminEmailSettings />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="permissions" element={<AdminPermissions />} />
                  <Route path="activity" element={<AdminActivityLog />} />
                </Route>
  
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Router>
            </ConfirmProvider>
          </AuthProvider>
        </CurrencyProvider>
      </ConfigProvider>
    </ThemeProvider>
  );
}

export default App;
