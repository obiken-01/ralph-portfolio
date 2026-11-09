import { useNavigation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

/**
 * A thin bar along the top edge while the next page's code downloads. Its
 * animation starts with a short delay, so a page that's already loaded (the
 * usual case after the first visit) never flashes it.
 */
function NavigationProgress() {
  const navigation = useNavigation()
  if (navigation.state === 'idle') return null

  return (
    <div className="nav-progress pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5"
         role="progressbar" aria-label="Loading page">
      <div className="h-full bg-teal-500" />
    </div>
  )
}

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <NavigationProgress />
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
