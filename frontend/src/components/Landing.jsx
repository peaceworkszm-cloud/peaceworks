import { useEffect, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import './Landing.css'
import { userState } from '../state/authAtoms'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8888/api'

const faqItems = [
  {
    question: 'Is Pieceworks Zambia safe to use?',
    answer:
      "Yes! Every helper has a profile with ratings from previous tasks. You can chat with them before meeting, and we recommend meeting in public places for the first time. Plus, you only pay when you're happy with the work!",
  },
  {
    question: 'What kind of tasks can I post?',
    answer:
      "Pretty much anything! Cleaning, gardening, moving help, basic home repairs, assembling furniture, tutoring, pet sitting, cooking, delivery - if it's a task someone can help you with, you can post it on Pieceworks Zambia.",
  },
  {
    question: 'How do payments work?',
    answer:
      "You agree on the price with your helper before starting. After the work is done to your satisfaction, you pay directly - cash, mobile money (Zambia's most popular!), or bank transfer, whatever you both agree on.",
  },
  {
    question: 'Does Pieceworks charge any fees?',
    answer:
      'Posting tasks is completely free! We only take a small 5% fee from helpers after they complete a task. This helps us keep the platform running, safe, and improving for everyone in Zambia.',
  },
]

function Landing() {
  const user = useRecoilValue(userState)
  const [tasks, setTasks] = useState([])
  const [activeFaq, setActiveFaq] = useState(null)
  const isLoggedIn = Boolean(user?.userId || user?.email || user?.phoneNumber)

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const res = await fetch(`${API_BASE}/tasks`)
        if (!res.ok) throw new Error('Failed to load tasks')
        const data = await res.json()
        if (Array.isArray(data)) {
          setTasks(data)
        }
      } catch (err) {
        console.error('Landing tasks load failed:', err.message || err)
        setTasks([])
      }
    }
    loadTasks()
  }, [])

  const handleAccept = (taskId) => {
    if (!isLoggedIn) {
      window.location.hash = '#/login'
      return false
    }
    const acceptedById = user?.userId || user?.email || user?.phoneNumber || 'me'
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              accepted: 'just now',
              acceptedNow: true,
              acceptedById,
              acceptedTimestamp: new Date().toISOString(),
            }
          : task,
      ),
    )
    return true
  }

  const handleDecline = (taskId) => {
    const task = tasks.find((item) => item.id === taskId)
    if (task) {
      alert(`You declined: "${task.title}".`)
    }
  }

  const navLinks = useMemo(
    () => [
      { label: 'Browse Tasks', href: '#tasks' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'For You', href: '#features' },
      { label: 'Community', href: '#community' },
      { label: 'FAQ', href: '#faq' },
    ],
    [],
  )

  return (
    <div className="landing-page">
      <nav>
        <div className="nav-container">
          <div className="logo">
            PIECEWORKS <strong>ZAMBIA</strong>
          </div>
          <div className="nav-links">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href}>
                {link.label}
              </a>
            ))}
            {isLoggedIn ? (
              <a href="#/profile" className="btn-secondary">
                Profile
              </a>
            ) : (
              <a href="#/login" className="btn-secondary">
                Log In
              </a>
            )}
            <a href={isLoggedIn ? '#/post' : '#/login'} className="btn-primary">
              Get Started
            </a>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-left">
          <div className="hero-content">
            <h1>Quick Cash for Everyday Tasks in Zambia</h1>
            <p>
              Need something done? Want to earn extra money? Pieceworks Zambia connects
              people for everyday tasks - simple, local, and hassle-free. Perfect for odd
              jobs, quick fixes, and helping hands.
            </p>
            <div className="hero-buttons">
              <a href="#tasks" className="btn btn-primary btn-large">
                Find Work Now
              </a>
              <a href="#/login" className="btn btn-secondary btn-large">
                Post work
              </a>
            </div>
          </div>
        </div>
        <div className="hero-right" aria-hidden="true"></div>
      </section>

      <section className="tasks" id="tasks">
        <div className="container">
          <div className="tasks-header">
            <h2>Available Pieceworks Near You</h2>
            <a href="#tasks" className="view-all">
              View All Tasks <i className="fas fa-arrow-right"></i>
            </a>
          </div>

          <div className="tasks-list">
            {tasks.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--gray)', padding: '2rem 0' }}>
                No tasks available right now. Check back soon!
              </p>
            ) : (
              tasks.map((task) => (
                <div className="task-row" key={task.publicId || task.id}>
                  <div
                    className="task-image"
                    style={{ backgroundImage: `url('${task.image}')` }}
                  >
                    <span className="task-category">{task.category}</span>
                  </div>
                  <div className="task-content">
                    <div className="task-header-top">
                      <span className="job-id">
                        <i className="fas fa-hashtag"></i> {task.publicId || task.id}
                      </span>
                      <span
                        className="job-status"
                        style={
                          task.statusTone === 'orange'
                            ? { backgroundColor: 'var(--secondary-orange)' }
                            : undefined
                        }
                      >
                        <i
                          className="fas fa-circle"
                          style={{ fontSize: '0.4rem', marginRight: '4px' }}
                        ></i>{' '}
                        {task.status}
                      </span>
                    </div>
                    <div className="task-title-section">
                      <h3 className="task-title">{task.title}</h3>
                      <div className="price-block">
                        <span className="offer-price">{task.offerPrice}</span>
                        <span className="unit-def">{task.unitDef}</span>
                        <span className="est-earning">{task.estEarning}</span>
                      </div>
                    </div>
                    <div className="task-meta-row">
                      <span className="meta-item">
                        <i className="far fa-calendar-alt"></i> {task.date}
                      </span>
                      <span className="meta-item">
                        <i className="far fa-clock"></i> {task.time}
                      </span>
                      <span className="meta-item">
                        <i className="fas fa-map-marker-alt"></i> {task.location}
                      </span>
                    </div>
                    <div className="employer-row">
                      <span className="employer-name">
                        <i className="fas fa-user-circle"></i> {task.employerName}
                      </span>
                      <span className="employer-id">ID: {task.employerId}</span>
                      <span className="verified-badge">
                        <i className="fas fa-check-circle"></i> Verified
                      </span>
                    </div>
                    <p className="task-short-desc">
                      <i className="fas fa-info-circle"></i> {task.shortDesc}
                    </p>
                    <div className="task-actions">
                      <button
                        className="btn-accept"
                        onClick={() => {
                          const accepted = handleAccept(task.id)
                          if (accepted) {
                            alert(
                              `You accepted: "${task.title}". The employer will be notified.`,
                            )
                          }
                        }}
                        disabled={task.acceptedNow}
                      >
                        <i className="fas fa-check"></i> Accept
                      </button>
                      <button className="btn-decline" onClick={() => handleDecline(task.id)}>
                        <i className="fas fa-times"></i> Decline
                      </button>
                      <span
                        className="accepted-timestamp"
                        style={
                          task.acceptedNow
                            ? { background: 'rgba(46,139,87,0.2)' }
                            : undefined
                        }
                      >
                        <i
                          className={
                            task.acceptedNow ? 'fas fa-check-circle' : 'fas fa-clock'
                          }
                        ></i>{' '}
                        Accepted: {task.accepted}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="quick-actions" id="how-it-works">
        <div className="container">
          <h2>How Pieceworks Zambia Works</h2>
          <div className="actions-container">
            <div className="action-card">
              <i className="fas fa-user-plus"></i>
              <h3>1. Create Account</h3>
              <p>Sign up in 2 minutes. Free for everyone - no hidden fees or subscriptions.</p>
            </div>
            <div className="action-card">
              <i className="fas fa-search"></i>
              <h3>2. Find or Post</h3>
              <p>Browse available pieceworks or post your own task with clear requirements.</p>
            </div>
            <div className="action-card">
              <i className="fas fa-handshake"></i>
              <h3>3. Connect & Agree</h3>
              <p>Chat with workers/task posters, agree on terms, and schedule the work.</p>
            </div>
            <div className="action-card">
              <i className="fas fa-money-bill-wave"></i>
              <h3>4. Get Paid</h3>
              <p>Complete the work, get paid instantly via cash or mobile money. Simple!</p>
            </div>
          </div>
        </div>
      </section>

      <section className="features" id="features">
        <div className="container">
          <h2>Perfect for Everyday Zambians</h2>
          <div className="features-container">
            <div className="feature-box">
              <h3>
                <i className="fas fa-hands-helping"></i> Need a Hand?
              </h3>
              <p>
                Get things done without the fuss of hiring professionals. Great for those
                small jobs that don't need a big company.
              </p>
              <ul style={{ paddingLeft: '1.2rem', marginTop: '1rem' }}>
                <li>Find help for any task, big or small</li>
                <li>Set your own budget - you're in control</li>
                <li>Support your local community</li>
                <li>Pay only when you're completely satisfied</li>
              </ul>
            </div>
            <div className="feature-box">
              <h3>
                <i className="fas fa-wallet"></i> Want Extra Cash?
              </h3>
              <p>
                Turn your skills and spare time into money. Pick tasks that fit your
                schedule and earn on your own terms.
              </p>
              <ul style={{ paddingLeft: '1.2rem', marginTop: '1rem' }}>
                <li>Work when you want, where you want</li>
                <li>No long-term commitments needed</li>
                <li>Build your reputation with reviews</li>
                <li>Get paid quickly after finishing tasks</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="community" id="community">
        <div className="container">
          <h2>Real Zambians, Real Stories</h2>
          <div className="testimonial">
            <p>
              "My backyard needed serious cleaning before the rains. I posted on Pieceworks
              and found a university student from my area who did an amazing job for much
              less than a professional company!"
            </p>
            <p className="author">– Sarah M., Lusaka</p>
          </div>
          <div className="testimonial">
            <p>
              "As a student at UNZA, Pieceworks helps me earn extra money between classes.
              I've done gardening, helped people move, and even fixed phones. The cash
              really helps with my expenses!"
            </p>
            <p className="author">– David K., University Student</p>
          </div>
          <h3
            style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--primary-blue)' }}
          >
            Popular Tasks on Pieceworks
          </h3>
          <div className="task-types">
            <div className="task-item">
              <i className="fas fa-broom"></i> Cleaning
            </div>
            <div className="task-item">
              <i className="fas fa-leaf"></i> Gardening
            </div>
            <div className="task-item">
              <i className="fas fa-truck-moving"></i> Moving
            </div>
            <div className="task-item">
              <i className="fas fa-tools"></i> Repairs
            </div>
            <div className="task-item">
              <i className="fas fa-chalkboard-teacher"></i> Tutoring
            </div>
            <div className="task-item">
              <i className="fas fa-box"></i> Delivery
            </div>
          </div>
        </div>
      </section>

      <section className="faq" id="faq">
        <div className="container">
          <h2>Got Questions? We've Got Answers</h2>
          <div className="faq-container">
            {faqItems.map((item, index) => {
              const isActive = activeFaq === index
              return (
                <div className={`faq-item ${isActive ? 'active' : ''}`} key={item.question}>
                  <div
                    className="faq-question"
                    onClick={() => setActiveFaq(isActive ? null : index)}
                  >
                    <h3>{item.question}</h3>
                    <i className="fas fa-chevron-down"></i>
                  </div>
                  <div className="faq-answer" style={{ maxHeight: isActive ? '400px' : 0 }}>
                    <p>{item.answer}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="container">
          <h2>Ready to Get Things Done?</h2>
          <p
            style={{
              fontSize: '1.2rem',
              marginBottom: '2.5rem',
              maxWidth: '700px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Join thousands of Zambians who are getting help with their to-do lists and earning
            extra money in their spare time. It's free to get started!
          </p>
          <a
            href="#/login"
            className="btn btn-primary btn-large"
            style={{ backgroundColor: 'var(--white)', color: 'var(--accent-green)' }}
          >
            Start Now - It's Free!
          </a>
        </div>
      </section>

      <footer>
        <div className="container">
          <div className="footer-content">
            <div className="logo" style={{ color: 'white', marginBottom: '1.5rem' }}>
              PIECEWORKS <strong>ZAMBIA</strong>
            </div>
            <div className="footer-links">
              <a href="about.html">About Us</a>
              <a href="#">Contact</a>
              <a href="#">Safety Tips</a>
              <a href="#">Terms</a>
              <a href="#">Privacy</a>
              <a href="#">For Task Posters</a>
              <a href="#">For Workers</a>
            </div>
            <div className="contact-info">
              <p>
                <i className="fas fa-envelope"></i> hello@pieceworks-zm.co.zm
              </p>
              <p>
                <i className="fas fa-phone"></i> +260 211 123 456 |{' '}
                <i className="fas fa-map-marker-alt"></i> Lusaka, Zambia
              </p>
            </div>
            <p style={{ marginTop: '2rem', opacity: 0.7, fontSize: '0.9rem' }}>
              © 2023 Pieceworks Zambia. Neighbors helping neighbors, one task at a time.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
