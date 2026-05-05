import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthProvider'
import ProtectedRoute from './routes/ProtectedRoute'
import Layout from './components/common/Layout'

// Public pages
import HomePage        from './pages/public/HomePage'
import TripsPage       from './pages/public/TripsPage'
import TripDetailPage  from './pages/public/TripDetailPage'
import PostDetailPage  from './pages/public/PostDetailPage'
import MapPage         from './pages/public/MapPage'
import TimelinePage    from './pages/public/TimelinePage'
import AboutPage       from './pages/public/AboutPage'

// Auth
import LoginPage from './pages/auth/LoginPage'

// Admin pages
import DashboardPage   from './pages/admin/DashboardPage'
import AdminTripsPage  from './pages/admin/AdminTripsPage'
import AdminPostsPage  from './pages/admin/AdminPostsPage'
import PostEditorPage  from './pages/admin/PostEditorPage'
import AdminAboutPage from './pages/admin/AdminAboutPage'
import AdminTimekeepingUsersPage from './pages/admin/AdminTimekeepingUsersPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>

          {/* ── Public routes (with Navbar + Footer) ── */}
          <Route path="/" element={
            <Layout><HomePage /></Layout>
          }/>
          <Route path="/trips" element={
            <Layout><TripsPage /></Layout>
          }/>
          <Route path="/trips/:id" element={
            <Layout><TripDetailPage /></Layout>
          }/>
          <Route path="/trips/:tripId/posts/:postId" element={
            <Layout><PostDetailPage /></Layout>
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

          {/* ── Auth (no Navbar/Footer) ── */}
          <Route path="/login" element={<LoginPage />} />

          {/* ── Admin (protected, no public Navbar/Footer) ── */}
          <Route path="/admin" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          }/>
          <Route path="/admin/trips" element={
            <ProtectedRoute><AdminTripsPage /></ProtectedRoute>
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