import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/auth/context/AuthContext';
import AppRoutes from './presentation/routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
