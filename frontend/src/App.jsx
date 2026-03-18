import { useEffect, useState } from 'react'
import './App.css'
import { useRecoilValue } from 'recoil'
import AuthLoginSignup from './components/AuthLoginSignup'
// import Home from './components/Home'
import Landing from './components/Landing'
import PostPiecework from './components/PostPiecework'
import Profile from './components/Profile'
import TaskAdmin from './components/TaskAdmin'
import UserManagement from './components/UserManagement'
import { authState } from './state/authAtoms'

function App() {
  const isAuthenticated = useRecoilValue(authState)
  const [route, setRoute] = useState(window.location.hash.replace('#', '') || '/')

  useEffect(() => {
    const onHashChange = () => {
      setRoute(window.location.hash.replace('#', '') || '/')
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (!isAuthenticated) {
    if (route === '/login') return <AuthLoginSignup />
    return <Landing />
  }

  if (route === '/post') {
    return <PostPiecework />
  }

  if (route === '/login') {
    return <AuthLoginSignup />
  }

  if (route === '/profile') {
    return <Profile />
  }

  if (route === '/tasks-admin') {
    return <TaskAdmin />
  }

  if (route === '/users-admin') {
    return <UserManagement />
  }

  return <Landing />
}

export default App
