import { useEffect, useMemo, useState } from 'react'
import { useRecoilState, useSetRecoilState } from 'recoil'
import './Profile.css'
import { authState, defaultUserState, userState } from '../state/authAtoms'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8888/api'
const emptyEditForm = {
  firstName: '',
  lastName: '',
  phoneNumber: '',
  bio: '',
  skills: '',
  languages: '',
}

function Profile() {
  const [user, setUser] = useRecoilState(userState)
  const setAuth = useSetRecoilState(authState)
  const [tasks, setTasks] = useState([])
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewTask, setReviewTask] = useState(null)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [actionState, setActionState] = useState({ status: 'idle', message: '' })
  const isSuperUser = useMemo(() => {
    const role = (user?.role || '').toString().toLowerCase().replace(/[\s_-]+/g, ' ').trim()
    return role === 'super user' || role === 'superuser' || role === 'super admin' || role === 'super'
  }, [user?.role])

  useEffect(() => {
    const load = async () => {
      setLoadingTasks(true)
      try {
        const res = await fetch(`${API_BASE}/tasks`)
        if (!res.ok) throw new Error('Failed to load tasks')
        const data = await res.json()
        setTasks(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Profile tasks load failed:', err.message || err)
        setTasks([])
      } finally {
        setLoadingTasks(false)
      }
    }
    load()
  }, [])

  const userKeys = useMemo(
    () => [user?.userId, user?.email, user?.phoneNumber, user?.username].filter(Boolean),
    [user]
  )

  const isPostedByMe = (task) =>
    userKeys.includes(task.employerUserId) || userKeys.includes(task.employerId)

  const postedByMe = useMemo(
    () => tasks.filter((task) => isPostedByMe(task)),
    [tasks, userKeys]
  )

  const acceptedByMe = useMemo(
    () => tasks.filter((task) => task.acceptedById && userKeys.includes(task.acceptedById)),
    [tasks, userKeys]
  )

  const acceptedOnMyJobs = useMemo(
    () =>
      tasks.filter(
        (task) =>
          isPostedByMe(task) &&
          task.acceptedById &&
          !userKeys.includes(task.acceptedById)
      ),
    [tasks, userKeys]
  )

  const handleOpenEdit = () => {
    if (!user) return
    setEditForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phoneNumber: user.phoneNumber || '',
      bio: user.bio || '',
      skills: (user.skills || []).join(', '),
      languages: (user.languages || []).join(', '),
    })
    setEditOpen(true)
  }

  const handleEditSubmit = (event) => {
    event.preventDefault()
    const updatedUser = {
      ...user,
      firstName: editForm.firstName.trim(),
      lastName: editForm.lastName.trim(),
      phoneNumber: editForm.phoneNumber.trim(),
      bio: editForm.bio.trim(),
      skills: editForm.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      languages: editForm.languages
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean),
    }
    setUser(updatedUser)
    setEditOpen(false)
  }

  const logout = () => {
    setAuth(false)
    setUser(defaultUserState)
  }

  const openReview = (task) => {
    setReviewTask(task)
    setReviewForm({ rating: 5, comment: '' })
    setReviewOpen(true)
  }

  const submitReview = async (event) => {
    event.preventDefault()
    if (!reviewTask?.id) return
    try {
      setActionState({ status: 'loading', message: 'Submitting review...' })
      const reviewForId =
        reviewTask?.acceptedById && !Number.isNaN(Number(reviewTask.acceptedById))
          ? Number(reviewTask.acceptedById)
          : undefined
      const res = await fetch(`${API_BASE}/tasks/${reviewTask.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: Number(reviewForm.rating),
          comment: reviewForm.comment,
          reviewBy: user?.email || user?.userId || user?.phoneNumber,
          reviewForId,
        }),
      })
      if (!res.ok) throw new Error(`Review failed (${res.status})`)
      const updated = await res.json()
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      setReviewOpen(false)
      setActionState({ status: 'success', message: 'Review submitted' })
      setTimeout(() => setActionState({ status: 'idle', message: '' }), 1000)
    } catch (err) {
      setActionState({ status: 'error', message: err.message || 'Review failed' })
    }
  }

  if (!user || !user.email) {
    return null
  }

  return (
    <div className="container">
      <div className="dashboard-header">
        <div className="logo">
          PIECEWORKS <strong>ZAMBIA</strong>
        </div>
        <div className="header-actions">
          <a className="btn btn-secondary" href="#/">
            <i className="fas fa-home"></i> Home
          </a>
          <a className="btn btn-outline" href="#/post">
            <i className="fas fa-plus"></i> Post job
          </a>
          {isSuperUser && (
            <>
              <a className="btn btn-outline" href="#/tasks-admin">
                <i className="fas fa-list"></i> Task list
              </a>
              <a className="btn btn-outline" href="#/users-admin">
                <i className="fas fa-users"></i> Users
              </a>
            </>
          )}
          <button className="btn btn-outline" onClick={logout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="profile-card">
          <div className="profile-header">
            <div className="avatar">
              <i className="fas fa-user-circle"></i>
            </div>
            <div className="profile-name">
              {user.firstName || user.username} {user.lastName || ''}
            </div>
            <div className="profile-phone">
              <i className="fas fa-phone-alt"></i> {user.phoneNumber}
            </div>
            <div className="profile-phone">
              <i className="fas fa-envelope"></i> {user.email}
            </div>
          </div>
          <div className="profile-detail">
            <div className="detail-label">Role</div>
            <div className="detail-value">{user.role || '-'}</div>
          </div>
          <div className="profile-detail">
            <div className="detail-label">Job Title</div>
            <div className="detail-value">{user.jobTitle || '-'}</div>
          </div>
          <div className="profile-detail">
            <div className="detail-label">Bio</div>
            <div className="detail-value">{user.bio || 'No bio yet.'}</div>
          </div>
          <div className="profile-detail">
            <div className="detail-label">Skills</div>
            <div className="skills-list">
              {(user.skills || []).length ? (
                user.skills.map((skill) => (
                  <span key={skill} className="skill-tag">
                    {skill}
                  </span>
                ))
              ) : (
                <span className="detail-value">None listed</span>
              )}
            </div>
          </div>
          <div className="profile-detail">
            <div className="detail-label">Languages</div>
            <div className="languages-list">
              {(user.languages || []).length ? (
                user.languages.map((language) => (
                  <span key={language} className="language-tag">
                    {language}
                  </span>
                ))
              ) : (
                <span className="detail-value">None listed</span>
              )}
            </div>
          </div>
          <button className="btn btn-secondary edit-profile-btn" onClick={handleOpenEdit}>
            <i className="fas fa-edit"></i> Edit Profile
          </button>
        </div>

        <div className="tasks-section">
          <div className="section-card">
            <div className="section-header">
              <h2>
                <i className="fas fa-clipboard-list"></i> Jobs I Posted
              </h2>
            </div>
            <div className="task-list">
              {postedByMe.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-inbox"></i> No jobs posted yet.
                </div>
              ) : (
                postedByMe.map((task) => <JobCard key={task.id} task={task} />)
              )}
            </div>
          </div>

          <div className="section-card">
            <div className="section-header">
              <h2>
                <i className="fas fa-check-circle"></i> Jobs I Accepted
              </h2>
            </div>
            <div className="task-list">
              {acceptedByMe.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-inbox"></i> No accepted jobs yet.
                </div>
              ) : (
                acceptedByMe.map((task) => (
                  <JobCard key={task.id} task={task} showAcceptedDetails />
                ))
              )}
            </div>
          </div>

          <div className="section-card">
            <div className="section-header">
              <h2>
                <i className="fas fa-user-check"></i> Accepted On My Jobs
              </h2>
            </div>
            <div className="task-list">
              {acceptedOnMyJobs.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-inbox"></i> No one has accepted your jobs yet.
                </div>
              ) : (
                acceptedOnMyJobs.map((task) => (
                  <JobCard
                    key={task.id}
                    task={task}
                    showAcceptor
                    canReview={
                      task.status === 'Completed' && !task.reviewGiven && task.acceptedById
                    }
                    onReview={() => openReview(task)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`modal ${editOpen ? 'active' : ''}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) setEditOpen(false)
        }}
      >
        <div className="modal-content">
          <button className="close-modal" onClick={() => setEditOpen(false)}>
            &times;
          </button>
          <h2>Edit Profile</h2>
          <form onSubmit={handleEditSubmit}>
            <input
              type="text"
              placeholder="First Name"
              value={editForm.firstName}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, firstName: event.target.value }))
              }
              required
            />
            <input
              type="text"
              placeholder="Last Name"
              value={editForm.lastName}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, lastName: event.target.value }))
              }
              required
            />
            <input
              type="text"
              placeholder="Phone Number"
              value={editForm.phoneNumber}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, phoneNumber: event.target.value }))
              }
              required
            />
            <textarea
              placeholder="Bio / About you"
              rows="3"
              value={editForm.bio}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, bio: event.target.value }))
              }
            ></textarea>
            <input
              type="text"
              placeholder="Skills (comma separated, e.g., Cleaning, Gardening)"
              value={editForm.skills}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, skills: event.target.value }))
              }
            />
            <input
              type="text"
              placeholder="Languages (comma separated, e.g., English, Bemba)"
              value={editForm.languages}
              onChange={(event) =>
                setEditForm((prev) => ({ ...prev, languages: event.target.value }))
              }
            />
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </form>
        </div>
      </div>

      <div
        className={`modal ${reviewOpen ? 'active' : ''}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) setReviewOpen(false)
        }}
      >
        <div className="modal-content">
          <button className="close-modal" onClick={() => setReviewOpen(false)}>
            &times;
          </button>
          <h2>Rate the worker</h2>
          {reviewTask && (
            <form onSubmit={submitReview}>
              <label>Task</label>
              <input type="text" value={reviewTask.title} readOnly />
              <label>Worker</label>
              <input type="text" value={reviewTask.acceptedByName || 'Worker'} readOnly />
              <label>Rating (1-5)</label>
              <select
                value={reviewForm.rating}
                onChange={(event) =>
                  setReviewForm((prev) => ({ ...prev, rating: event.target.value }))
                }
                required
              >
                {[5, 4, 3, 2, 1].map((r) => (
                  <option key={r} value={r}>
                    {r} stars
                  </option>
                ))}
              </select>
              <label>Comment (optional)</label>
              <textarea
                rows="3"
                value={reviewForm.comment}
                onChange={(event) =>
                  setReviewForm((prev) => ({ ...prev, comment: event.target.value }))
                }
                placeholder="Describe the work quality, timeliness, etc."
              ></textarea>
              <button type="submit" className="btn btn-primary">
                Submit review
              </button>
            </form>
          )}
        </div>
      </div>

      {actionState.status !== 'idle' && (
        <div className="modal active">
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

function JobCard({
  task,
  showAcceptedDetails = false,
  showAcceptor = false,
  canReview = false,
  onReview,
}) {
  const statusKey = String(task.status || 'Open').toLowerCase().replace(/\s+/g, '-')
  const statusClass =
    statusKey === 'open'
      ? 'status-open'
      : statusKey === 'accepted'
        ? 'status-assigned'
        : statusKey === 'completed'
          ? 'status-completed'
          : 'status-canceled'

  return (
    <div className="task-item">
      <div className="task-title">
        <h3>{task.title}</h3>
        <span className={`task-status ${statusClass}`}>{task.status || 'Open'}</span>
      </div>
      <div className="task-details">
        <span>
          <i className="fas fa-tag"></i> {task.category}
        </span>
        <span>
          <i className="fas fa-map-marker-alt"></i> {task.location}
        </span>
        <span>
          <i className="fas fa-calendar-alt"></i> {task.date}
        </span>
      </div>
      <div className="task-details">
        <span>
          <i className="fas fa-money-bill-wave"></i> {task.offerPrice || task.price}
        </span>
        <span>
          <i className="fas fa-balance-scale"></i> {task.unitDef || 'Per task'}
        </span>
      </div>
      {showAcceptedDetails && (
        <div className="task-details">
          <span>
            <i className="fas fa-map-marker-alt"></i> Location: {task.location}
          </span>
          <span>
            <i className="fas fa-money-check-alt"></i> Labour fee: {task.offerPrice || task.price}
          </span>
        </div>
      )}
      {showAcceptor && (
        <div className="task-details">
          <span>
            <i className="fas fa-user"></i> Accepted by: {task.acceptedByName || 'Worker'}
          </span>
          {task.acceptedByPhone && (
            <span>
              <i className="fas fa-phone"></i> {task.acceptedByPhone}
            </span>
          )}
        </div>
      )}
      {canReview && (
        <div className="task-actions">
          <button className="btn btn-primary" onClick={onReview}>
            <i className="fas fa-star"></i> Review worker
          </button>
        </div>
      )}
    </div>
  )
}

export default Profile
