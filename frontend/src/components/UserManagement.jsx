import { useEffect, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import './UserManagement.css'
import { userState } from '../state/authAtoms'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8888/api'

const parsePrice = (value) => {
  if (!value) return 0
  const match = value.toString().replace(/,/g, '').match(/([-+]?[0-9]*\.?[0-9]+)/)
  return match ? parseFloat(match[1]) : 0
}

const normalizeKey = (val) => (val ?? '').toString().trim()

function UserManagement() {
  const currentUser = useRecoilValue(userState)
  const [users, setUsers] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionState, setActionState] = useState({ status: 'idle', message: '' })
  const [expandedUserId, setExpandedUserId] = useState(null)

  const isSuperUser = useMemo(() => {
    const role = (currentUser?.role || '').toLowerCase()
    return role.includes('super')
  }, [currentUser?.role])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      setActionState({ status: 'loading', message: 'Loading users and tasks...' })
      try {
        const [usersRes, tasksRes] = await Promise.all([
          fetch(`${API_BASE}/user/users?limit=500`),
          fetch(`${API_BASE}/tasks`),
        ])

        if (!usersRes.ok) throw new Error('Failed to load users')
        if (!tasksRes.ok) throw new Error('Failed to load tasks')

        const usersData = await usersRes.json()
        const tasksData = await tasksRes.json()

        setUsers(Array.isArray(usersData?.users) ? usersData.users : [])
        setTasks(Array.isArray(tasksData) ? tasksData : [])
        setActionState({ status: 'success', message: 'Data loaded' })
        setTimeout(() => setActionState({ status: 'idle', message: '' }), 800)
      } catch (err) {
        setError(err.message || 'Failed to load data')
        setActionState({ status: 'error', message: err.message || 'Failed to load data' })
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const userStats = useMemo(() => {
    return users.map((user) => {
      const keys = [
        normalizeKey(user.id),
        normalizeKey(user.email),
        normalizeKey(user.phoneNumber),
        normalizeKey(user.username),
      ].filter(Boolean)

      const posted = tasks.filter((task) =>
        keys.includes(normalizeKey(task.employerUserId)) || keys.includes(normalizeKey(task.employerId))
      )
      const accepted = tasks.filter((task) =>
        keys.includes(normalizeKey(task.acceptedById))
      )

      const paidOut = posted.reduce((sum, task) => sum + parsePrice(task.offerPrice || task.price), 0)
      const earned = accepted.reduce((sum, task) => sum + parsePrice(task.offerPrice || task.price), 0)

      return {
        user,
        posted,
        accepted,
        paidOut,
        earned,
      }
    })
  }, [users, tasks])

  if (!isSuperUser) {
    return (
      <div className="user-mgmt-page">
        <div className="user-mgmt-header">
          <div>
            <p className="eyebrow">Restricted</p>
            <h1>Super User Only</h1>
            <p className="muted">You need super-user access to view user management.</p>
          </div>
          <a className="btn btn-outline" href="#/profile">
            <i className="fas fa-arrow-left"></i> Back to profile
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="user-mgmt-page">
      <div className="user-mgmt-header">
        <div>
          <p className="eyebrow">Super User Tool</p>
          <h1>User Management</h1>
          <p className="muted">
            Overview of all users, their posted and accepted jobs, and rough earnings based on offer price.
          </p>
        </div>
        <div className="header-actions">
          <a className="btn btn-outline" href="#/profile">
            <i className="fas fa-arrow-left"></i> Back to profile
          </a>
          <a className="btn btn-secondary" href="#/tasks-admin">
            <i className="fas fa-list"></i> Task list
          </a>
        </div>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {loading ? (
        <div className="empty-state">
          <i className="fas fa-spinner fa-spin"></i> Loading users...
        </div>
      ) : userStats.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-inbox"></i> No users found.
        </div>
      ) : (
        <div className="user-grid">
          {userStats.map(({ user, posted, accepted, paidOut, earned }) => {
            const isExpanded = expandedUserId === user.id
            return (
              <div key={user.id} className="user-card">
                <div className="card-top">
                  <div>
                    <div className="user-name">
                      {user.username || 'Unnamed'}{' '}
                      <span className="role-chip">{user.role || 'User'}</span>
                    </div>
                    <div className="user-meta">
                      <span>
                        <i className="fas fa-envelope"></i> {user.email}
                      </span>
                      <span>
                        <i className="fas fa-phone"></i> {user.phoneNumber || 'No phone'}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-outline"
                    onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                  >
                    {isExpanded ? 'Hide details' : 'View details'}
                  </button>
                </div>

                <div className="stat-row">
                  <div className="stat">
                    <div className="stat-label">Posted</div>
                    <div className="stat-value">{posted.length}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Accepted</div>
                    <div className="stat-value">{accepted.length}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Paid out</div>
                    <div className="stat-value">K {paidOut.toFixed(2)}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-label">Earned</div>
                    <div className="stat-value">K {earned.toFixed(2)}</div>
                  </div>
                </div>

                <div className="reviews-note">
                  Reviews: not tracked in the current data model.
                </div>

                {isExpanded && (
                  <div className="tasks-breakdown">
                    <div>
                      <h4>Posted jobs</h4>
                      {posted.length === 0 ? (
                        <p className="muted">None.</p>
                      ) : (
                        <ul>
                          {posted.slice(0, 6).map((task) => (
                            <li key={task.id || task.publicId}>
                              <strong>{task.title}</strong> — {task.offerPrice || task.price || 'N/A'}
                            </li>
                          ))}
                          {posted.length > 6 && (
                            <li className="muted">+{posted.length - 6} more</li>
                          )}
                        </ul>
                      )}
                    </div>
                    <div>
                      <h4>Accepted jobs</h4>
                      {accepted.length === 0 ? (
                        <p className="muted">None.</p>
                      ) : (
                        <ul>
                          {accepted.slice(0, 6).map((task) => (
                            <li key={task.id || task.publicId}>
                              <strong>{task.title}</strong> — {task.offerPrice || task.price || 'N/A'}
                            </li>
                          ))}
                          {accepted.length > 6 && (
                            <li className="muted">+{accepted.length - 6} more</li>
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {actionState.status !== 'idle' && (
        <div className="action-overlay">
          <div className="action-box">
            <div className="action-icon">
              {actionState.status === 'loading' && <i className="fas fa-spinner fa-spin"></i>}
              {actionState.status === 'success' && <i className="fas fa-check-circle"></i>}
              {actionState.status === 'error' && <i className="fas fa-times-circle"></i>}
            </div>
            <div className="action-message">{actionState.message}</div>
            {actionState.status !== 'loading' && (
              <button
                className="btn btn-secondary"
                onClick={() => setActionState({ status: 'idle', message: '' })}
              >
                OK
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
