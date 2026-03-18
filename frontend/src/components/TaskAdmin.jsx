import { useEffect, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import './TaskAdmin.css'
import { userState } from '../state/authAtoms'
import { API_BASE } from '../config/api'
const EMPTY_FILTERS = { text: '', user: '', taskId: '' }

const statusOptions = ['Open', 'In Progress', 'Accepted', 'Completed', 'Closed', 'Canceled']

const normalize = (value) =>
  (value ?? '')
    .toString()
    .toLowerCase()
    .trim()

function TaskAdmin() {
  const user = useRecoilValue(userState)
  const [tasks, setTasks] = useState([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [editingTask, setEditingTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionState, setActionState] = useState({ status: 'idle', message: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    if (actionState.status === 'success') {
      const timer = setTimeout(() => setActionState({ status: 'idle', message: '' }), 1200)
      return () => clearTimeout(timer)
    }
  }, [actionState.status])

  useEffect(() => {
    const load = async () => {
      setError('')
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE}/tasks`)
        if (!res.ok) throw new Error(`Failed to load tasks (${res.status})`)
        const data = await res.json()
        setTasks(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err.message || 'Failed to load tasks')
        setTasks([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const textQuery = normalize(filters.text)
      const userQuery = normalize(filters.user)
      const idQuery = normalize(filters.taskId)

      const textHaystack = normalize(
        [
          task.title,
          task.shortDesc,
          task.category,
          task.location,
          task.offerPrice,
          task.unitDef,
          task.estEarning,
        ]
          .filter(Boolean)
          .join(' ')
      )
      const userHaystack = normalize(
        [task.employerName, task.employerId, task.employerUserId, task.acceptedByName]
          .filter(Boolean)
          .join(' ')
      )
      const idHaystack = normalize([task.publicId, task.id].filter(Boolean).join(' '))

      return (
        (!textQuery || textHaystack.includes(textQuery)) &&
        (!userQuery || userHaystack.includes(userQuery)) &&
        (!idQuery || idHaystack.includes(idQuery))
      )
    })
  }, [tasks, filters])

  const handleDelete = async (taskId) => {
    if (!taskId) return
    const confirmed = window.confirm('Delete this task? This cannot be undone.')
    if (!confirmed) return
    try {
      setActionState({ status: 'loading', message: 'Deleting task...' })
      setSaving(true)
      const res = await fetch(`${API_BASE}/tasks/${taskId}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`)
      setTasks((prev) =>
        prev.filter((task) => task.id !== Number(taskId) && task.publicId !== taskId)
      )
      setActionState({ status: 'success', message: 'Task deleted successfully' })
    } catch (err) {
      setActionState({ status: 'error', message: err.message || 'Failed to delete task' })
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (task) => setEditingTask({ ...task })

  const closeEdit = () => setEditingTask(null)

  const handleEditChange = (field, value) =>
    setEditingTask((prev) => ({ ...prev, [field]: value }))

  const handleSave = async (event) => {
    event.preventDefault()
    const editKey = editingTask?.id || editingTask?.publicId
    if (!editKey) return

    try {
      setActionState({ status: 'loading', message: 'Saving changes...' })
      setSaving(true)
      const res = await fetch(`${API_BASE}/tasks/${editKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTask),
      })
      if (!res.ok) throw new Error(`Update failed (${res.status})`)
      const updated = await res.json()
      setTasks((prev) =>
        prev.map((task) => {
          const taskKey = task.id || task.publicId
          if (taskKey !== editKey) return task
          return { ...task, ...updated }
        })
      )
      setEditingTask(null)
      setActionState({ status: 'success', message: 'Task updated successfully' })
    } catch (err) {
      setActionState({ status: 'error', message: err.message || 'Failed to update task' })
    } finally {
      setSaving(false)
    }
  }

  const clearFilters = () => setFilters(EMPTY_FILTERS)

  const statusClass = (status) => {
    const key = normalize(status)
    if (key.includes('progress')) return 'chip status-progress'
    if (key.includes('accept')) return 'chip status-accepted'
    if (key.includes('complete')) return 'chip status-completed'
    if (key.includes('close') || key.includes('cancel')) return 'chip status-closed'
    return 'chip status-open'
  }

  return (
    <div className="task-admin-page">
      <div className="task-admin-header">
        <div>
          <p className="eyebrow">Super User Tool</p>
          <h1>Task List</h1>
          <p className="muted">
            Search by user name, task text, or task ID. Update or delete any saved task.
          </p>
        </div>
        <div className="header-actions">
          <a className="btn btn-outline" href="#/profile">
            <i className="fas fa-arrow-left"></i> Back to profile
          </a>
          <button className="btn btn-secondary" onClick={clearFilters}>
            <i className="fas fa-undo"></i> Clear filters
          </button>
        </div>
      </div>

      <div className="filters-grid">
        <div className="filter-field">
          <label>
            <i className="fas fa-align-left"></i> Text
          </label>
          <input
            type="text"
            placeholder="Title, description, location, price..."
            value={filters.text}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, text: event.target.value }))
            }
          />
        </div>
        <div className="filter-field">
          <label>
            <i className="fas fa-user"></i> User name
          </label>
          <input
            type="text"
            placeholder="Employer or acceptor name"
            value={filters.user}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, user: event.target.value }))
            }
          />
        </div>
        <div className="filter-field">
          <label>
            <i className="fas fa-hashtag"></i> Task ID
          </label>
          <input
            type="text"
            placeholder="e.g. PW-240315-42"
            value={filters.taskId}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, taskId: event.target.value }))
            }
          />
        </div>
      </div>

      <div className="results-meta">
        {loading
          ? 'Loading tasks...'
          : `Showing ${filteredTasks.length} of ${tasks.length} task(s)${
              filters.text || filters.user || filters.taskId ? ' (filtered)' : ''
            }`}
        {error ? ` – ${error}` : ''}
      </div>

      <div className="task-admin-list">
        {loading ? (
          <div className="empty-state">
            <i className="fas fa-spinner fa-spin"></i> Loading...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-inbox"></i> No tasks match these filters.
          </div>
        ) : (
          filteredTasks.map((task, index) => (
            <div
              key={task.id || task.publicId || `${task.title || 'task'}-${index}`}
              className="task-admin-card"
            >
              <div className="card-top">
                <div>
                  <div className="task-id">
                    <i className="fas fa-hashtag"></i> {task.id || task.publicId || 'N/A'}
                  </div>
                  <h3>{task.title || 'Untitled task'}</h3>
                </div>
                <span className={statusClass(task.status)}>{task.status || 'Open'}</span>
              </div>

              <div className="meta-row">
                <span>
                  <i className="fas fa-user-circle"></i> {task.employerName || 'Unknown user'}
                </span>
                <span>
                  <i className="fas fa-map-marker-alt"></i> {task.location || 'No location'}
                </span>
                <span>
                  <i className="fas fa-calendar-alt"></i> {task.date || 'No date'}
                </span>
              </div>

              <p className="description">
                {task.shortDesc || task.description || 'No description provided.'}
              </p>

              <div className="meta-row secondary">
                <span>
                  <i className="fas fa-coins"></i> {task.offerPrice || task.price || '—'}
                </span>
                <span>
                  <i className="fas fa-balance-scale"></i> {task.unitDef || 'Per task'}
                </span>
                {task.category && (
                  <span>
                    <i className="fas fa-folder"></i> {task.category}
                  </span>
                )}
              </div>

              <div className="card-actions">
                <button
                  className="btn btn-outline"
                  onClick={() => openEdit(task)}
                  disabled={saving}
                >
                  <i className="fas fa-pen"></i> Update
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(task.id || task.publicId)}
                  disabled={saving}
                >
                  <i className="fas fa-trash"></i> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div
        className={`modal ${editingTask ? 'active' : ''}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeEdit()
        }}
      >
        {editingTask && (
          <div className="modal-content">
            <button className="close-modal" onClick={closeEdit}>
              &times;
            </button>
            <h2>Update Task</h2>
            <form onSubmit={handleSave} className="edit-form">
              <div className="two-col">
                <div>
                  <label>Task ID</label>
                  <input
                    type="text"
                    value={editingTask.id || editingTask.publicId || ''}
                    readOnly
                  />
                </div>
                <div>
                  <label>Status</label>
                  <select
                    value={editingTask.status || 'Open'}
                    onChange={(event) => handleEditChange('status', event.target.value)}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label>Title</label>
              <input
                type="text"
                value={editingTask.title || ''}
                onChange={(event) => handleEditChange('title', event.target.value)}
                required
              />

              <div className="two-col">
                <div>
                  <label>Category</label>
                  <input
                    type="text"
                    value={editingTask.category || ''}
                    onChange={(event) => handleEditChange('category', event.target.value)}
                  />
                </div>
                <div>
                  <label>Location</label>
                  <input
                    type="text"
                    value={editingTask.location || ''}
                    onChange={(event) => handleEditChange('location', event.target.value)}
                  />
                </div>
              </div>

              <div className="two-col">
                <div>
                  <label>Date</label>
                  <input
                    type="text"
                    value={editingTask.date || ''}
                    onChange={(event) => handleEditChange('date', event.target.value)}
                  />
                </div>
                <div>
                  <label>Unit / Rate</label>
                  <input
                    type="text"
                    value={editingTask.unitDef || ''}
                    onChange={(event) => handleEditChange('unitDef', event.target.value)}
                  />
                </div>
              </div>

              <div className="two-col">
                <div>
                  <label>Offer price</label>
                  <input
                    type="text"
                    value={editingTask.offerPrice || ''}
                    onChange={(event) => handleEditChange('offerPrice', event.target.value)}
                  />
                </div>
                <div>
                  <label>Employer name</label>
                  <input
                    type="text"
                    value={editingTask.employerName || ''}
                    onChange={(event) => handleEditChange('employerName', event.target.value)}
                  />
                </div>
              </div>

              <label>Description</label>
              <textarea
                rows="3"
                value={editingTask.shortDesc || editingTask.description || ''}
                onChange={(event) => handleEditChange('shortDesc', event.target.value)}
              ></textarea>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={closeEdit}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

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

export default TaskAdmin
