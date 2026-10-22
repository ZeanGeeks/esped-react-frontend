import { Link } from 'react-router-dom'
import { Banner } from '../../components/layout/AppShell'
import { EmptyState } from '../../components/ui/EmptyState'

export function HomePage({ homeData }) {
  return (
    <main>
      <Banner title="Welcome to ESPED Resort" breadcrumb="Home" hero>
        <p className="tagline">A peaceful place to rest, relax, and enjoy your stay.</p>
        <div className="hero-actions">
          <Link className="button" to="/services">Browse Services</Link>
          <Link className="text-link" to="/recommendation">Ask the AI Assistant</Link>
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
            <h2>Recommended stays</h2>
          </div>
          <p>Handpicked options for your next visit.</p>
        </div>
        {homeData.featured_services?.length ? (
          <div className="feature-grid">
            {homeData.featured_services.slice(0, 6).map((service) => (
              <article className="feature-card" key={service.id}>
                <span className="feature-number">{service.service_type}</span>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                <p className="meta">₱{Number(service.price).toFixed(2)} • Capacity {service.capacity}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="New experiences are on their way" description="Our resort offerings will appear here soon." />
        )}
      </section>

      <section className="content-section mini-ai-box">
        <h3>Need help deciding?</h3>
        <p>Try the AI recommendation form with your budget, guest count, and preferences.</p>
        <Link className="button" to="/recommendation">Go to Recommendation</Link>
      </section>

      <section className="contact-section">
        <h2>Ready to book your stay?</h2>
        <Link className="button" to="/booking">Book now</Link>
      </section>
    </main>
  )
}

export function AboutOrContactPage({ title, breadcrumb, info }) {
  const isContact = title === 'Contact'

  return (
    <main>
      <Banner title={title} breadcrumb={breadcrumb} />
      <section className={`content-section ${isContact ? 'contact-page' : 'about-page'}`}>
        <div className="page-intro">
          <p className="section-kicker">{isContact ? 'Plan your visit' : 'A place to slow down'}</p>
          <h2>{isContact ? 'We’re here to help you plan your stay.' : 'Classic comfort, warm hospitality.'}</h2>
          <p>{info?.description || (isContact
            ? 'Reach out to our team with questions about your visit, resort services, or booking.'
            : 'Discover a peaceful resort experience shaped around time together, thoughtful comforts, and a warm welcome.')}</p>
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
              src={info?.google_maps_url || 'https://www.google.com/maps?q=14.5995,120.9842&output=embed'}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        ) : (
          <div className="about-highlights">
            <article><span>01</span><h3>Room to unwind</h3><p>Thoughtfully prepared spaces for restful stays and easy get-togethers.</p></article>
            <article><span>02</span><h3>Time together</h3><p>Make space for shared meals, celebrations, and quiet afternoons.</p></article>
            <article><span>03</span><h3>A warm welcome</h3><p>Our team is here to help make every visit feel simple and memorable.</p></article>
          </div>
        )}
      </section>
    </main>
  )
}
