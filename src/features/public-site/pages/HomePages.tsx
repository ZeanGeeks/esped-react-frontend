import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Banner } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/ui/EmptyState'
import { TurnstileWidget } from '@/components/ui/TurnstileWidget'
import { createContactInquiry } from '../api/publicApi'

export function HomePage({ homeData, resourceState, onRetry }) {
  return (
    <main>
      <Banner title="Welcome to ESPED Resort" breadcrumb="" hero>
        <p className="tagline">Relax by the pool, enjoy the slide, and make time for fun together.</p>
        <div className="hero-actions">
          <Link className="button hero-primary" to="/services">Browse Services</Link>
          <Link className="text-link hero-secondary" to="/recommendation">Ask the AI Assistant</Link>
        </div>
      </Banner>

      <section className="content-section intro-section">
        <div>
          <p className="section-kicker">About preview</p>
          <h2>About ESPED Resort</h2>
        </div>
        <div className="intro-detail">
          <p>{homeData.about_preview || 'Discover our spaces, services, and warm hospitality.'}</p>
          <Link className="text-link dark-link" to="/about">Read more</Link>
        </div>
      </section>

      <section className="content-section stay-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Featured services</p>
            <h2>Featured resort services</h2>
          </div>
          <p>Explore the experiences available for your next visit.</p>
        </div>
        {resourceState.error && (
          <div className="resource-notice resource-notice--error" role="alert">
            <span>{resourceState.error}</span>
            <button type="button" onClick={onRetry}>Retry featured services</button>
          </div>
        )}
        {resourceState.loading && <p className="resource-notice" role="status">Loading featured services…</p>}
        {homeData.featured_services?.length ? (
          <div className="feature-grid">
            {homeData.featured_services.slice(0, 6).map((service) => (
            <Link
              aria-label={`Book ${service.name}`}
              className="feature-card feature-card--link"
              key={service.id}
              to={`/booking?service_id=${service.id}`}
            >
              <span className="feature-number">{service.service_type}</span>
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              <p className="meta">₱{Number(service.price).toFixed(2)} • Capacity {service.capacity}</p>
            </Link>
            ))}
          </div>
        ) : !resourceState.loading && !resourceState.error ? (
          <EmptyState title="New experiences are on their way" description="Our resort offerings will appear here soon." />
        ) : null}
      </section>

      <section className="content-section mini-ai-box">
        <h3>Need help deciding?</h3>
        <p>Try the AI recommendation form with your budget, guest count, and preferences.</p>
        <Link className="button" to="/recommendation">Go to Recommendation</Link>
      </section>

      <section className="contact-section">
        <h2>Ready to plan your visit?</h2>
        <Link className="button" to="/booking">Book now</Link>
      </section>
    </main>
  )
}

export function AboutOrContactPage({ title, breadcrumb, info }) {
  const isContact = title === 'Contact'
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const submitInquiry = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!turnstileToken) {
      setError('Complete the anti-spam verification before sending your inquiry.')
      return
    }

    setSubmitting(true)
    try {
      const result = await createContactInquiry({ ...form, turnstile_token: turnstileToken })
      setNotice(result.message || 'Your inquiry was sent to the resort team.')
      setForm({ name: '', email: '', phone: '', subject: '', message: '' })
      setTurnstileToken('')
      setTurnstileResetKey((version) => version + 1)
    } catch (requestError) {
      setError(requestError.message)
      setTurnstileToken('')
      setTurnstileResetKey((version) => version + 1)
    } finally {
      setSubmitting(false)
    }
  }

  const updateForm = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  return (
    <main>
      <Banner title={title} breadcrumb={breadcrumb} />
      <section className={`content-section ${isContact ? 'contact-page' : 'about-page'}`}>
        <div className="page-intro">
          <p className="section-kicker">{isContact ? 'Plan your visit' : 'A place to slow down'}</p>
          <h2>{isContact ? 'We’re here to help you plan your visit.' : 'Poolside fun and a warm welcome.'}</h2>
          <p>{info?.description || (isContact
            ? 'Reach out to our team with questions about your visit, resort services, or booking.'
            : 'Discover a cheerful resort experience with time together, poolside relaxation, and a warm welcome.')}</p>
        </div>
        {isContact ? (
          <div className="contact-details">
            <article className="contact-detail-card">
              <span className="section-kicker">Visit</span>
              <h3>Find us</h3>
              <p>{info?.address || 'Resort address details will be available soon.'}</p>
            </article>
            <article className="contact-detail-card">
              <span className="section-kicker">Call</span>
              <h3>Talk with our team</h3>
              {info?.phone ? <a href={`tel:${info.phone}`}>{info.phone}</a> : <p>Phone details will be available soon.</p>}
            </article>
            <article className="contact-detail-card">
              <span className="section-kicker">Email</span>
              <h3>Send us a note</h3>
              {info?.email ? <a href={`mailto:${info.email}`}>{info.email}</a> : <p>Email details will be available soon.</p>}
            </article>
            <iframe
              className="contact-map"
              title="Map showing the resort location"
              src={info?.google_maps_url || 'https://www.google.com/maps?q=13.1084826,121.4279225&output=embed'}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <section aria-labelledby="contact-inquiry-title" className="contact-inquiry">
              <p className="section-kicker">Contact the resort</p>
              <h3 id="contact-inquiry-title">Send us an inquiry</h3>
              <p>Ask us about booking, resort services, or preparing for your visit. Our team will follow up using the email you provide.</p>
              {error && <p className="error-text" role="alert">{error}</p>}
              {notice && <p className="ok-text" role="status">{notice}</p>}
              <form className="contact-inquiry-form" onSubmit={submitInquiry}>
                <label htmlFor="contact-name">Name</label>
                <input autoComplete="name" id="contact-name" maxLength={100} onChange={updateForm('name')} required value={form.name} />
                <label htmlFor="contact-email">Email</label>
                <input autoComplete="email" id="contact-email" maxLength={150} onChange={updateForm('email')} required type="email" value={form.email} />
                <label htmlFor="contact-phone">Phone (optional, if you prefer a call back)</label>
                <input autoComplete="tel" id="contact-phone" maxLength={30} onChange={updateForm('phone')} pattern="[+0-9() -]*" type="tel" value={form.phone} />
                <p className="form-note">We’ll reply by email. Share your number if you’d prefer the resort team to call about this inquiry.</p>
                <label htmlFor="contact-subject">Topic</label>
                <input id="contact-subject" maxLength={120} onChange={updateForm('subject')} placeholder="Booking, services, payment, or other" required value={form.subject} />
                <label htmlFor="contact-message">Message</label>
                <textarea id="contact-message" maxLength={2000} onChange={updateForm('message')} required rows={6} value={form.message} />
                <TurnstileWidget action="contact_inquiry" onToken={setTurnstileToken} resetKey={turnstileResetKey} />
                <button className="button" disabled={submitting || !turnstileToken} type="submit">
                  {submitting ? 'Sending inquiry…' : 'Send inquiry'}
                </button>
              </form>
            </section>
          </div>
        ) : (
          <div className="about-highlights">
            <article><span>01</span><h3>Poolside time</h3><p>Cool off, relax, and enjoy a day together at the swimming pool.</p></article>
            <article><span>02</span><h3>Slide into fun</h3><p>Make the most of the pool slide and an energetic day at the resort.</p></article>
            <article><span>03</span><h3>Karaoke and photos</h3><p>Sing together and capture memories in the resort’s photo-taking area.</p></article>
          </div>
        )}
      </section>
    </main>
  )
}
