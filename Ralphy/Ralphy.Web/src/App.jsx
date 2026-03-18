import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthProvider'
import ProtectedRoute from './routes/ProtectedRoute'

// Public pages
import HomePage        from './pages/public/HomePage'
import TripsPage       from './pages/public/TripsPage'
import TripDetailPage  from './pages/public/TripDetailPage'
import PostDetailPage  from './pages/public/PostDetailPage'
import MapPage         from './pages/public/MapPage'
import TimelinePage    from './pages/public/TimelinePage'

// Auth
import LoginPage from './pages/auth/LoginPage'

// Admin pages
import DashboardPage   from './pages/admin/DashboardPage'
import AdminTripsPage  from './pages/admin/AdminTripsPage'
import AdminPostsPage  from './pages/admin/AdminPostsPage'
import PostEditorPage  from './pages/admin/PostEditorPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>

          {/* ── Public routes ── */}
          <Route path="/"              element={<HomePage />} />
          <Route path="/trips"         element={<TripsPage />} />
          <Route path="/trips/:id"     element={<TripDetailPage />} />
          <Route path="/trips/:tripId/posts/:postId"
                                       element={<PostDetailPage />} />
          <Route path="/map"           element={<MapPage />} />
          <Route path="/timeline"      element={<TimelinePage />} />

          {/* ── Auth ── */}
          <Route path="/login"         element={<LoginPage />} />

          {/* ── Admin (protected) ── */}
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

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}