import { useEffect, useState } from 'react'
import './PostPiecework.css'
import { useRecoilValue } from 'recoil'
import { userState } from '../state/authAtoms'

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=600'
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8888/api'

function generateJobId() {
  const now = new Date()
  const year = now.getFullYear().toString().slice(2)
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 90 + 10)
  return `PW-${year}${month}${day}-${random}`
}

function PostPiecework() {
  const user = useRecoilValue(userState)
  const [jobId, setJobId] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionState, setActionState] = useState({ status: 'idle', message: '' })
  const [form, setForm] = useState({
    title: '',
    category: '',
    status: 'Open',
    location: '',
    date: '',
    startTime: '',
    endTime: '',
    offerPrice: '',
    unitDef: '',
    estEarning: '',
    shortDesc: '',
    employerName: '',
    employerId: '',
    employerUserId: '',
    verified: true,
    imageUrl: '',
    acceptedTimestamp: '',
  })

  useEffect(() => {
    setJobId(generateJobId())
  }, [])

  useEffect(() => {
    if (!user) return
    const displayName =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || ''
    const employerId = user.userId || user.email || user.phoneNumber || ''
    setForm((prev) => ({
      ...prev,
      employerName: displayName,
      employerId,
      employerUserId: employerId,
    }))
  }, [user])

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!user?.email) {
      alert('You must be logged in to post a job.')
      return
    }
    if (isUploading || submitting) {
      alert('Please wait for the current upload/action to finish.')
      return
    }

    const payload = {
      publicId: jobId || generateJobId(),
      status: form.status,
      title: form.title,
      category: form.category,
      location: form.location,
      date: form.date,
      time: form.startTime || form.time || '',
      startTime: form.startTime || '',
      endTime: form.endTime || '',
      offerPrice: form.offerPrice,
      unitDef: form.unitDef,
      estEarning: form.estEarning || '',
      shortDesc: form.shortDesc,
      employerName: form.employerName,
      employerId: form.employerId,
      employerUserId: form.employerUserId,
      verified: form.verified,
      imageUrl: form.imageUrl || DEFAULT_IMAGE,
      acceptedTimestamp: form.acceptedTimestamp || null,
    }

    const submitTask = async () => {
      try {
        setSubmitting(true)
        setActionState({ status: 'loading', message: 'Creating task...' })
        const res = await fetch(`${API_BASE}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(`Create failed (${res.status})`)
        setActionState({ status: 'success', message: 'Task created successfully' })
        setTimeout(() => {
          setActionState({ status: 'idle', message: '' })
          window.location.hash = '#/'
        }, 1200)
      } catch (err) {
        setActionState({ status: 'error', message: err.message || 'Failed to create task' })
      } finally {
        setSubmitting(false)
      }
    }

    submitTask()
  }

  return (
    <div className="container">
      <a href="#/" className="back-link">
        <i className="fas fa-arrow-left"></i> Back to tasks
      </a>
      <h1>
        <i className="fas fa-pen-to-square"></i> Post a Piecework
      </h1>
      <p className="intro-text">
        Fill in the details exactly as they should appear on the task card.
      </p>

      <form id="postPieceworkForm" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label>
              <i className="fas fa-tag"></i> Job Title *
            </label>
            <input
              type="text"
              name="title"
              placeholder="e.g. House Cleaning Needed"
              value={form.title ?? ''}
              onChange={handleChange}
              title="Short job title that appears on the card."
              required
            />
          </div>

          <div className="form-group">
            <label>
              <i className="fas fa-folder"></i> Category *
            </label>
            <select
              name="category"
              value={form.category ?? ''}
              onChange={handleChange}
              title="Pick the closest category so workers can filter."
              required
            >
              <option value="">Select category</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Gardening">Gardening</option>
              <option value="Moving">Moving</option>
              <option value="Repairs">Repairs</option>
              <option value="Tutoring">Tutoring</option>
              <option value="Delivery">Delivery</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>
              <i className="fas fa-hashtag"></i> Job ID (auto)
            </label>
            <input
              type="text"
              value={jobId ?? ''}
              className="readonly-input"
              title="Auto-generated job ID."
              readOnly
            />
          </div>

          <div className="form-group">
            <label>
              <i className="fas fa-circle"></i> Status
            </label>
            <select
              name="status"
              value={form.status ?? 'Open'}
              onChange={handleChange}
              title="Current status of the task."
            >
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div className="form-group">
            <label>
              <i className="fas fa-map-marker-alt"></i> Location *
            </label>
            <input
              type="text"
              name="location"
              placeholder="e.g. Lusaka, Woodlands"
              value={form.location ?? ''}
              onChange={handleChange}
              title="Where the work will take place."
              required
            />
          </div>

          <div className="form-group">
            <label>
              <i className="far fa-calendar-alt"></i> Date(s) *
            </label>
            <input
              type="text"
              name="date"
              placeholder="e.g. Sat, 15 Feb  or  Every Mon, Wed"
              value={form.date ?? ''}
              onChange={handleChange}
              title="Date or schedule for the work."
              required
            />
          </div>

          <div className="form-group">
            <label>
              <i className="far fa-clock"></i> Start time
            </label>
            <input
              type="text"
              name="startTime"
              placeholder="e.g. 09:00"
              value={form.startTime ?? ''}
              onChange={handleChange}
              title="Optional start time."
            />
          </div>
          <div className="form-group">
            <label>
              <i className="far fa-clock"></i> End time
            </label>
            <input
              type="text"
              name="endTime"
              placeholder="e.g. 12:00"
              value={form.endTime ?? ''}
              onChange={handleChange}
              title="Optional end time."
            />
          </div>

          <div className="form-group">
            <label>
              <i className="fas fa-coins"></i> Offer price *
            </label>
            <input
              type="text"
              name="offerPrice"
              placeholder="e.g. K 350"
              value={form.offerPrice ?? ''}
              onChange={handleChange}
              title="Price you will pay for this task."
              required
            />
          </div>
          <div className="form-group">
            <label>
              <i className="fas fa-cubes"></i> Unit definition *
            </label>
            <input
              type="text"
              name="unitDef"
              placeholder="per task / per hour / per bag"
              value={form.unitDef ?? ''}
              onChange={handleChange}
              title="What the price is based on."
              required
            />
          </div>

          <div className="form-group full-width">
            <label>
              <i className="fas fa-chart-line"></i> Estimated earning range
            </label>
            <input
              type="text"
              name="estEarning"
              placeholder="e.g. Est. K350-K400  (optional)"
              value={form.estEarning ?? ''}
              onChange={handleChange}
              title="Optional expected earning range."
            />
          </div>

          <div className="form-group full-width">
            <label>
              <i className="fas fa-align-left"></i> Short description *
            </label>
            <textarea
              name="shortDesc"
              rows="2"
              placeholder="Briefly describe the task (max 100 characters)"
              maxLength={100}
              value={form.shortDesc ?? ''}
              onChange={handleChange}
              title="Short summary shown on the card (max 100 chars)."
              required
            ></textarea>
            <span className="helper-text">Will appear in one line on the card.</span>
          </div>

          <div className="form-group">
            <label>
              <i className="fas fa-user"></i> Employer name *
            </label>
            <input
              type="text"
              name="employerName"
              placeholder="e.g. Mutinta K."
              value={form.employerName ?? ''}
              onChange={handleChange}
              title="Auto-filled from your profile."
              readOnly
              required
            />
          </div>
          <div className="form-group">
            <label>
              <i className="fas fa-id-card"></i> Employer ID *
            </label>
            <input
              type="text"
              name="employerId"
              placeholder="e.g. ZM87654"
              value={form.employerId ?? ''}
              onChange={handleChange}
              title="Auto-filled unique ID."
              readOnly
              required
            />
          </div>

          <div className="form-group checkbox-group">
            <input
              type="checkbox"
              id="verified"
              name="verified"
              checked={!!form.verified}
              onChange={handleChange}
              title="Mark if the employer is verified."
            />
            <label htmlFor="verified">
              <i className="fas fa-check-circle"></i> Verified employer
            </label>
          </div>

          <div className="form-group full-width">
            <label>
              <i className="fas fa-upload"></i> Or upload an image
            </label>
            <input
              type="file"
              accept="image/*"
              title="Upload a thumbnail image for the task card."
              onChange={async (event) => {
                const file = event.target.files && event.target.files[0]
                if (!file) {
                  return
                }
                setUploadError('')
                setIsUploading(true)
                try {
                  const formData = new FormData()
                  formData.append('file', file)
                  formData.append('folder', 'piecework-images')
                  const response = await fetch(`${API_BASE}/uploads/file`, {
                    method: 'POST',
                    body: formData,
                  })
                  if (!response.ok) {
                    const text = await response.text()
                    throw new Error(text || 'Image upload failed')
                  }
                  const data = await response.json()
                  const uploadedUrl = data.fileUrl || data.imageUrl || ''
                  if (!uploadedUrl) {
                    throw new Error('Upload succeeded but no URL was returned')
                  }
                  setForm((prev) => ({ ...prev, imageUrl: uploadedUrl }))
                } catch (err) {
                  setUploadError(err.message || 'Image upload failed')
                } finally {
                  setIsUploading(false)
                }
              }}
            />
            {isUploading ? (
              <span className="helper-text">Uploading image...</span>
            ) : uploadError ? (
              <span className="helper-text error-text">{uploadError}</span>
            ) : (
              <span className="helper-text">Select a file to upload to R2.</span>
            )}
            {form.imageUrl ? (
              <div className="image-preview">
                <img src={form.imageUrl} alt="Thumbnail preview" />
              </div>
            ) : null}
          </div>

          <div className="form-group">
            <label>
              <i className="fas fa-clock"></i> Acceptance timestamp
            </label>
            <input
              type="text"
              name="acceptedTimestamp"
              placeholder="leave empty for 'pending'"
              value={form.acceptedTimestamp ?? ''}
              onChange={handleChange}
              title="When the task was accepted (optional)."
            />
          </div>
        </div>

        <hr />
        <button type="submit" className="btn-submit" disabled={isUploading || submitting}>
          <i className="fas fa-cloud-upload-alt"></i> Post Piecework Now
        </button>
      </form>

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
                type="button"
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

export default PostPiecework
