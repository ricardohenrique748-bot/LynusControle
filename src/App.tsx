import { RouterProvider } from 'react-router-dom';
import { router } from './app/router.tsx';
import { AppProviders } from './app/providers.tsx';

export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
