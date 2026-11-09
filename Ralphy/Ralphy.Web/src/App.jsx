import { createElement } from 'react'
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
  ScrollRestoration,
  useParams,
} from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthProvider'
import ProtectedRoute from './routes/ProtectedRoute'
import Layout from './components/common/Layout'

// The home page is the most common landing page, so it ships in the main
// bundle. Every other page is split out and fetched the first time it's
// visited, which keeps the admin editor (TipTap) and the map (Leaflet) out of
// a first-time visitor's download.
import HomePage from './pages/public/HomePage'

/**
 * Route `lazy` loader for a page module's default export. `render` optionally
 * wraps the loaded component, e.g. in ProtectedRoute.
 */
const page = (load, render) => async () => {
  const { default: Page } = await load()
  return { Component: render ? () => render(Page) : Page }
}

const adminPage = (load) =>
  page(load, (component) => <ProtectedRoute>{createElement(component)}</ProtectedRoute>)

/**
 * In-app fallback for the old nested post URL.
 *
 * nginx already answers a full page load at /trips/:tripId/posts/:postId with
 * a real 301 (see nginx.conf) — that is what a crawler sees. This only catches
 * client-side navigation, which never reaches nginx at all.
 */
function LegacyPostRedirect() {
  const { postId } = useParams()
  return <Navigate to={`/posts/${postId}`} replace />
}

function Root() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <Outlet />
      {/* Rendered after the page so its layout effect runs once the page has
          laid out: a new page starts at the top, and Back/Forward return to
          where the visitor was. */}
      <ScrollRestoration />
    </AuthProvider>
  )
}

/** Public pages share the Navbar + Footer. */
function PublicLayout() {
  return <Layout><Outlet /></Layout>
}

const routes = [{
  element: <Root />,
  // Shown only on a first load straight into a lazily-loaded page, while its
  // code downloads. Matches the page background so it reads as a blank frame.
  hydrateFallbackElement: <div className="min-h-screen bg-stone-50" />,
  children: [
    {
      element: <PublicLayout />,
      children: [
        { path: '/', element: <HomePage /> },
        { path: '/posts', lazy: page(() => import('./pages/public/PostsFeedPage')) },
        { path: '/posts/:id', lazy: page(() => import('./pages/public/PostDetailPage')) },
        {
          path: '/tags/:name',
          lazy: page(() => import('./pages/public/PostsFeedPage'),
            (component) => createElement(component, { filterByTag: true })),
        },
        { path: '/map', lazy: page(() => import('./pages/public/MapPage')) },
        { path: '/timeline', lazy: page(() => import('./pages/public/TimelinePage')) },
        { path: '/about', lazy: page(() => import('./pages/public/AboutPage')) },
      ],
    },

    // ── Legacy trip URLs ──
    { path: '/trips/:tripId/posts/:postId', element: <LegacyPostRedirect /> },
    { path: '/trips/:id', element: <Navigate to="/posts" replace /> },
    { path: '/trips', element: <Navigate to="/posts" replace /> },

    // ── Auth (no Navbar/Footer) ──
    { path: '/login', lazy: page(() => import('./pages/auth/LoginPage')) },

    // ── Admin (protected, no public Navbar/Footer) ──
    { path: '/admin', lazy: adminPage(() => import('./pages/admin/DashboardPage')) },
    { path: '/admin/posts', lazy: adminPage(() => import('./pages/admin/AdminPostsPage')) },
    { path: '/admin/posts/new', lazy: adminPage(() => import('./pages/admin/PostEditorPage')) },
    { path: '/admin/posts/:id/edit', lazy: adminPage(() => import('./pages/admin/PostEditorPage')) },
    { path: '/admin/about', lazy: adminPage(() => import('./pages/admin/AdminAboutPage')) },
    { path: '/admin/work-users', lazy: adminPage(() => import('./pages/admin/AdminWorkUsersPage')) },
    // Renamed in the Work module rollout; keeps existing bookmarks alive.
    { path: '/admin/timekeeping-users', element: <Navigate to="/admin/work-users" replace /> },
  ],
}]

const router = createBrowserRouter(routes)

export default function App() {
  return <RouterProvider router={router} />
}
