import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthProvider'
import ProtectedRoute from './routes/ProtectedRoute'
import Layout from './components/common/Layout'

// Public pages
import HomePage        from './pages/public/HomePage'
import PostsFeedPage   from './pages/public/PostsFeedPage'
import PostDetailPage  from './pages/public/PostDetailPage'
import MapPage         from './pages/public/MapPage'
import TimelinePage    from './pages/public/TimelinePage'
import AboutPage       from './pages/public/AboutPage'

// Auth
import LoginPage from './pages/auth/LoginPage'

// Admin pages
import DashboardPage   from './pages/admin/DashboardPage'
import AdminPostsPage  from './pages/admin/AdminPostsPage'
import PostEditorPage  from './pages/admin/PostEditorPage'
import AdminAboutPage from './pages/admin/AdminAboutPage'
import AdminTimekeepingUsersPage from './pages/admin/AdminTimekeepingUsersPage'

// Scroll to top on route change (SPA navigations keep scroll otherwise)
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

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

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>

          {/* ── Public routes (with Navbar + Footer) ── */}
          <Route path="/" element={
            <Layout><HomePage /></Layout>
          }/>
          <Route path="/posts" element={
            <Layout><PostsFeedPage /></Layout>
          }/>
          <Route path="/posts/:id" element={
            <Layout><PostDetailPage /></Layout>
          }/>
          <Route path="/tags/:name" element={
            <Layout><PostsFeedPage filterByTag /></Layout>
          }/>
          <Route path="/map" element={
            <Layout><MapPage /></Layout>
          }/>
          <Route path="/timeline" element={
            <Layout><TimelinePage /></Layout>
          }/>
          <Route path="/about" element={
            <Layout><AboutPage /></Layout>
          }/>

          {/* ── Legacy trip URLs ── */}
          <Route path="/trips/:tripId/posts/:postId" element={<LegacyPostRedirect />} />
          <Route path="/trips/:id" element={<Navigate to="/posts" replace />} />
          <Route path="/trips" element={<Navigate to="/posts" replace />} />

          {/* ── Auth (no Navbar/Footer) ── */}
          <Route path="/login" element={<LoginPage />} />

          {/* ── Admin (protected, no public Navbar/Footer) ── */}
          <Route path="/admin" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          }/>
          <Route path="/admin/posts" element={
            <ProtectedRoute><AdminPostsPage /></ProtectedRoute>
          }/>
          <Route path="/admin/posts/new" element={
            <ProtectedRoute><PostEditorPage /></ProtectedRoute>
          }/>
          <Route path="/admin/posts/:id/edit" element={
            <ProtectedRoute><PostEditorPage /></ProtectedRoute>
          }/>
          <Route path="/admin/about" element={
            <ProtectedRoute><AdminAboutPage /></ProtectedRoute>
          }/>
          <Route path="/admin/timekeeping-users" element={
            <ProtectedRoute><AdminTimekeepingUsersPage /></ProtectedRoute>
          }/>

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
