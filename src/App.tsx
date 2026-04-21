import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './presentation/routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
