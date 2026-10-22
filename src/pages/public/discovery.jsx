import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Banner } from '../../components/layout/AppShell'
import { EmptyState } from '../../components/ui/EmptyState'

export function ServicesPage({ services, onSearch }) {
  const [search, setSearch] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [sort, setSort] = useState('asc')

  useEffect(() => {
    const id = setTimeout(() => onSearch({ search, service_type: serviceType, sort }), 250)
    return () => clearTimeout(id)
  }, [search, serviceType, sort, onSearch])

  return (
    <main>
      <Banner title="Services" breadcrumb="Home / Services" />
      <section className="content-section">
        <div className="toolbar">
          <input placeholder="Search services..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
            <option value="">All types</option>
            <option value="cottage">Cottage</option>
            <option value="room">Room</option>
            <option value="amenity">Amenity</option>
            <option value="package">Package</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="asc">Price: Low to High</option>
            <option value="desc">Price: High to Low</option>
          </select>
        </div>
        {services.length > 0 ? (
          <div className="feature-grid">
            {services.map((service) => (
              <article className="feature-card" key={service.id}>
                <span className="feature-number">{service.service_type}</span>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                <p className="meta">₱{Number(service.price).toFixed(2)} • Capacity {service.capacity}</p>
                <Link className="text-link dark-link" to="/booking">Add to booking</Link>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No services available yet" description="We’re preparing our resort offerings. Please check back soon." />
        )}
      </section>
    </main>
  )
}

export function RecommendationPage({ api, user }) {
  const [form, setForm] = useState({ maximum_budget: '', number_of_guests: '', preferences: '' })
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await api('/recommendation', { method: 'POST', body: form })
      setResult(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main>
      <Banner title="AI Recommendation" breadcrumb="Home / Recommendation" />
      <section className="content-section">
        <form className="form-grid" onSubmit={submit}>
          <label>Maximum budget<input type="number" min="0.01" step="0.01" placeholder="Enter your budget" value={form.maximum_budget} onChange={(e) => setForm({ ...form, maximum_budget: e.target.value })} required /></label>
          <label>Number of guests<input type="number" min="1" step="1" placeholder="Guest count" value={form.number_of_guests} onChange={(e) => setForm({ ...form, number_of_guests: e.target.value })} required /></label>
          <label className="field-wide">Preferences<textarea placeholder="Tell us what you’re looking for" value={form.preferences} onChange={(e) => setForm({ ...form, preferences: e.target.value })} /></label>
          <button className="button" type="submit" disabled={busy}>{busy ? 'Finding options…' : 'Get recommendation'}</button>
        </form>
        {error && <p className="error-text">{error}</p>}
        {result && (
          result.items.length ? (
            <div className="feature-grid recommendation-results">
              {result.items.map((item) => (
                <article className="feature-card" key={`${item.service.id}-${item.rank_order}`}>
                  <span className="feature-number">Rank #{item.rank_order}</span>
                  <h3>{item.service.name}</h3>
                  <p>{item.match_reason}</p>
                  <p className="meta">₱{Number(item.service.price).toFixed(2)} • Capacity {item.service.capacity}</p>
                  <Link className="button" to={user ? '/booking' : '/login'}>Book this</Link>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No matches found" description="Try adjusting your budget or preferences, or check back when more services are available." />
          )
        )}
      </section>
    </main>
  )
}
