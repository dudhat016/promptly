import { useTranslation } from 'react-i18next';
import AuthLayout from '../../components/auth/AuthLayout';
import ForgotPasswordForm from '../../components/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();

  return (
    <AuthLayout
      title={t('auth.forgot.title')}
      subtitle={t('auth.forgot.subtitle')}
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
