import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AssetPage } from './pages/AssetPage';
import { BookLayout } from './pages/BookLayout';
import { Dashboard } from './pages/Dashboard';
import { Library } from './pages/Library';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

const router = createBrowserRouter([
  { path: '/', element: <Library /> },
  {
    path: '/books/:id',
    element: <BookLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'blueprint', element: <AssetPage section="blueprint" /> },
      { path: 'world', element: <AssetPage section="world" /> },
      { path: 'characters', element: <AssetPage section="characters" /> },
      { path: 'outline', element: <AssetPage section="outline" /> },
    ],
  },
]);

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root not found');

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
