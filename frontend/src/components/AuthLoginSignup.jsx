import { useState } from 'react'
import { useSetRecoilState } from 'recoil'
import './AuthLoginSignup.css'
import { authState, defaultUserState, userState } from '../state/authAtoms'
import { API_BASE } from '../config/api'

const normalizeUser = (payload) => ({
  ...defaultUserState,
  ...payload,
  currentStoreId: payload.currentStoreId ?? payload.storeIds?.[0] ?? null,
  currentStoreName: payload.currentStoreName ?? payload.storeNames?.[0] ?? null,
  currentWarehouseId: payload.currentWarehouseId ?? payload.warehouseIds?.[0] ?? null,
  currentWarehouseName: payload.currentWarehouseName ?? payload.warehouseNames?.[0] ?? null,
})

function AuthLoginSignup() {
  const setAuth = useSetRecoilState(authState)
  const setUser = useSetRecoilState(userState)

  const [activeTab, setActiveTab] = useState('login')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    phoneNumber: '',
    nrc_card_id: '',
    password: '',
    role: 'STAFF',
    jobTitle: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleLoginSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginForm.email.trim(),
          password: loginForm.password.trim(),
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Login failed')
      }

      const data = await response.json()
      setUser(normalizeUser(data))
      setAuth(true)
      window.location.hash = '#/'
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const payload = {
        username: registerForm.username.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password.trim(),
        phoneNumber: registerForm.phoneNumber.trim(),
        nrc_card_id: registerForm.nrc_card_id.trim(),
        role: registerForm.role,
        jobTitle: registerForm.jobTitle.trim() || undefined,
        frontendUrl: window.location.origin,
      }

      const response = await fetch(`${API_BASE}/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.message || 'Registration failed')
      }

      setMessage(result?.message || 'Registration successful. Please verify your email.')
      setActiveTab('login')
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-card">
      <h1>
        PIECEWORKS <strong>ZAMBIA</strong>
      </h1>
      <div className="subhead">Connecting skills with opportunity</div>

      <div className="tabs">
        <button
          type="button"
          className={`tab ${activeTab === 'login' ? 'active' : ''}`}
          onClick={() => setActiveTab('login')}
        >
          Log In
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          Sign Up
        </button>
      </div>

      {(error || message) && (
        <div className={`banner ${error ? 'banner-error' : 'banner-success'}`}>
          {error || message}
        </div>
      )}

      {activeTab === 'login' && (
        <form className="form active" onSubmit={handleLoginSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={loginForm.email}
            onChange={(event) =>
              setLoginForm((prev) => ({ ...prev, email: event.target.value }))
            }
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={loginForm.password}
            onChange={(event) =>
              setLoginForm((prev) => ({ ...prev, password: event.target.value }))
            }
            required
          />
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Log In'}
          </button>
        </form>
      )}

      {activeTab === 'create' && (
        <form className="form active" onSubmit={handleRegisterSubmit}>
          <h3>Create a new account</h3>
          <p>It's quick and easy.</p>

          <input
            type="text"
            placeholder="Username"
            value={registerForm.username}
            onChange={(event) =>
              setRegisterForm((prev) => ({ ...prev, username: event.target.value }))
            }
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={registerForm.email}
            onChange={(event) =>
              setRegisterForm((prev) => ({ ...prev, email: event.target.value }))
            }
            required
          />
          <input
            type="text"
            placeholder="Phone number"
            value={registerForm.phoneNumber}
            onChange={(event) =>
              setRegisterForm((prev) => ({ ...prev, phoneNumber: event.target.value }))
            }
            required
          />
          <input
            type="text"
            placeholder="NRC ID"
            value={registerForm.nrc_card_id}
            onChange={(event) =>
              setRegisterForm((prev) => ({ ...prev, nrc_card_id: event.target.value }))
            }
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={registerForm.password}
            onChange={(event) =>
              setRegisterForm((prev) => ({ ...prev, password: event.target.value }))
            }
            required
          />
          <input
            type="text"
            placeholder="Job title (optional)"
            value={registerForm.jobTitle}
            onChange={(event) =>
              setRegisterForm((prev) => ({ ...prev, jobTitle: event.target.value }))
            }
          />
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Sign Up'}
          </button>

          <div className="terms">
            By clicking Sign Up, you agree to our <a href="#">Terms</a>,{' '}
            <a href="#">Privacy Policy</a> and <a href="#">Cookies Policy</a>.
          </div>
        </form>
      )}

      <div className="back-home">
        <a href="#/">
          <i className="fas fa-arrow-left"></i> Back to Home
        </a>
      </div>
    </div>
  )
}

export default AuthLoginSignup
