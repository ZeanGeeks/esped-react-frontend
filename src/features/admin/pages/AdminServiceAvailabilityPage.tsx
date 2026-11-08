import { useEffect, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { Link, useParams } from 'react-router-dom'
import { Banner } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/ui/EmptyState'
import { getApiErrorMessage } from '@/lib/apiErrors'
import { useAdminApi } from '../hooks/useAdminApi'

type Service = {
  id: number
  name: string
  capacity: number | string
}

type AvailabilityRow = {
  available_date: string
  total_quantity: number | string
  booked_quantity: number | string
}

function dateKey(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

export function AdminServiceAvailabilityPage({
  services,
  servicesLoading,
  servicesError,
}: {
  services: Service[]
  servicesLoading: boolean
  servicesError: string
}) {
  const { serviceId } = useParams()
  const service = services.find((row) => String(row.id) === serviceId)
  const currentServiceId = service?.id
  const adminApi = useAdminApi()
  const [today] = useState(() => dateKey(new Date()))
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()))
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [selectionMode, setSelectionMode] = useState<'single' | 'range'>('single')
  const [rangeAwaitingEnd, setRangeAwaitingEnd] = useState(false)
  const [quantityState, setQuantityState] = useState({ serviceId: null as number | null, value: '' })
  const [availabilityState, setAvailabilityState] = useState<{
    serviceId: number | null
    rows: AvailabilityRow[]
    status: 'idle' | 'loading' | 'ready' | 'error'
    error: string
  }>({
    serviceId: null as number | null,
    rows: [] as AvailabilityRow[],
    status: 'idle',
    error: '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [notice, setNotice] = useState('')

  const totalQuantity = quantityState.serviceId === currentServiceId
    ? quantityState.value
    : String(service?.capacity ?? '')
  const availabilityRows = availabilityState.serviceId === currentServiceId
    ? availabilityState.rows
    : []
  const availabilityLoading = currentServiceId !== undefined
    && (availabilityState.serviceId !== currentServiceId || availabilityState.status === 'loading')
  const availabilityError = availabilityState.serviceId === currentServiceId
    ? availabilityState.error
    : ''
  const updateTotalQuantity = (value: string) => {
    if (service) setQuantityState({ serviceId: service.id, value })
  }

  useEffect(() => {
    if (currentServiceId === undefined) return
    let active = true
    adminApi.getServiceAvailability(currentServiceId)
      .then((result) => {
        if (active) {
          setAvailabilityState({
            serviceId: currentServiceId,
            rows: result.availability || [],
            status: 'ready',
            error: '',
          })
        }
      })
      .catch((error) => {
        if (active) {
          setAvailabilityState({
            serviceId: currentServiceId,
            rows: [],
            status: 'error',
            error: getApiErrorMessage(error),
          })
        }
      })
    return () => { active = false }
  }, [adminApi, currentServiceId])

  const availabilityByDate = new Map(availabilityRows.map((row) => [row.available_date, row]))

  const reloadAvailability = () => {
    if (!service) return Promise.resolve()
    setAvailabilityState({
      serviceId: service.id,
      rows: availabilityRows,
      status: 'loading',
      error: '',
    })
    return adminApi.getServiceAvailability(service.id)
      .then((result) => {
        setAvailabilityState({
          serviceId: service.id,
          rows: result.availability || [],
          status: 'ready',
          error: '',
        })
      })
      .catch((error) => {
        setAvailabilityState({
          serviceId: service.id,
          rows: [],
          status: 'error',
          error: getApiErrorMessage(error),
        })
      })
  }

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(calendarMonth)),
    end: endOfWeek(endOfMonth(calendarMonth)),
  })

  const selectDate = (date: Date) => {
    const selected = dateKey(date)
    const availability = availabilityByDate.get(selected)
    setCalendarMonth(startOfMonth(date))
    setSaveError('')
    setNotice('')
    if (availability) {
      updateTotalQuantity(String(availability.total_quantity))
    } else if (selectionMode === 'single' || !rangeAwaitingEnd) {
      updateTotalQuantity(String(service?.capacity ?? ''))
    }

    if (selectionMode === 'single') {
      setStartDate(selected)
      setEndDate(selected)
      setRangeAwaitingEnd(false)
      return
    }

    if (!rangeAwaitingEnd) {
      setStartDate(selected)
      setEndDate(selected)
      setRangeAwaitingEnd(true)
      return
    }

    const rangeStart = selected < startDate ? selected : startDate
    const rangeEnd = selected < startDate ? startDate : selected
    setStartDate(rangeStart)
    setEndDate(rangeEnd)
    setRangeAwaitingEnd(false)
  }

  const saveAvailability = async (event) => {
    event.preventDefault()
    if (!service) return
    setSaveError('')
    setNotice('')

    if (!startDate || !endDate || endDate < startDate) {
      setSaveError('Choose a valid start and end date.')
      return
    }

    const rangeDays = (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000
    if (rangeDays > 365) {
      setSaveError('A date range can cover up to 366 days.')
      return
    }
    if (!Number.isInteger(Number(totalQuantity)) || Number(totalQuantity) < 0) {
      setSaveError('Available quantity must be a whole number of zero or more.')
      return
    }

    setSaving(true)
    try {
      await adminApi.saveServiceAvailability(service.id, {
        start_date: startDate,
        end_date: endDate,
        total_quantity: Number(totalQuantity),
      })
      await reloadAvailability()
      setNotice(`Availability saved for ${startDate === endDate ? startDate : `${startDate} to ${endDate}`}.`)
    } catch (error) {
      setSaveError(getApiErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  if (!service) {
    return (
      <main className="admin-main">
        <Banner title="Service availability" breadcrumb="Admin / Services / Availability" />
        <section className="content-section">
          {servicesLoading ? (
            <p className="form-note" role="status">Loading services…</p>
          ) : servicesError ? (
            <p className="error-text" role="alert">{servicesError}</p>
          ) : (
            <EmptyState title="Service not found" description="This service may have been removed. Return to services and select a current listing." />
          )}
          <Link className="button button-secondary availability-back-link" to="/admin/services">Back to services</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="admin-main">
      <Banner title={`${service.name} availability`} breadcrumb={`Admin / Services / ${service.name}`} />
      <section className="content-section service-availability-page">
        <Link className="availability-back-link" to="/admin/services">← Back to services</Link>
        <div className="availability-page-heading">
          <div>
            <p className="section-kicker">Booking calendar</p>
            <h2>Manage {service.name}</h2>
            <p className="form-note">Select one date or choose a range. Dates are inclusive; you can configure up to 366 days at a time.</p>
          </div>
          <span className="availability-default-capacity">Default capacity: {service.capacity}</span>
        </div>

        <div className="availability-manager">
          <section className="availability-calendar-panel" aria-label={`${service.name} availability calendar`}>
            <div className="availability-calendar-toolbar">
              <button type="button" aria-label="Previous month" onClick={() => setCalendarMonth((month) => subMonths(month, 1))}>‹</button>
              <h3 aria-live="polite">{format(calendarMonth, 'MMMM yyyy')}</h3>
              <button type="button" aria-label="Next month" onClick={() => setCalendarMonth((month) => addMonths(month, 1))}>›</button>
            </div>
            <div className="availability-calendar-grid">
              {eachDayOfInterval({
                start: startOfWeek(new Date(2024, 0, 7)),
                end: endOfWeek(new Date(2024, 0, 7)),
              }).map((date) => (
                <span className="availability-weekday" key={format(date, 'EEEE')}>
                  {format(date, 'EEE')}
                </span>
              ))}
              {calendarDays.map((date) => {
                const key = dateKey(date)
                const row = availabilityByDate.get(key)
                const remaining = row
                  ? Math.max(0, Number(row.total_quantity) - Number(row.booked_quantity))
                  : null
                const selected = key >= startDate && key <= endDate
                const stateLabel = row
                  ? remaining === 0 ? 'Fully booked' : `${remaining} available`
                  : 'Not set'

                return (
                  <button
                    className={[
                      'availability-day',
                      !isSameMonth(date, calendarMonth) && 'availability-day--outside',
                      isToday(date) && 'availability-day--today',
                      row && remaining === 0 && 'availability-day--full',
                      row && remaining !== null && remaining > 0 && 'availability-day--available',
                      selected && 'availability-day--selected',
                    ].filter(Boolean).join(' ')}
                    type="button"
                    key={key}
                    aria-label={`${format(date, 'EEEE, MMMM d, yyyy')}: ${stateLabel}${row ? `, ${row.booked_quantity} booked of ${row.total_quantity}` : ''}`}
                    aria-pressed={selected}
                    disabled={availabilityLoading || saving}
                    onClick={() => selectDate(date)}
                  >
                    <span className="availability-day-number">{format(date, 'd')}</span>
                    <span className="availability-day-state">{stateLabel}</span>
                    {row && <span className="availability-day-booked">{row.booked_quantity} / {row.total_quantity} booked</span>}
                  </button>
                )
              })}
            </div>
            <div className="availability-legend" aria-label="Calendar legend">
              <span><i className="availability-legend-dot availability-legend-dot--available" />Available</span>
              <span><i className="availability-legend-dot availability-legend-dot--full" />Fully booked</span>
              <span><i className="availability-legend-dot availability-legend-dot--unset" />Not set</span>
            </div>
            {availabilityLoading && <p className="form-note" role="status">Loading availability…</p>}
            {availabilityError && (
              <p className="error-text" role="alert">
                {availabilityError}{' '}
                <button className="inline-retry-button" type="button" onClick={reloadAvailability}>Retry loading dates</button>
              </p>
            )}
          </section>

          <form className="availability-edit-panel" onSubmit={saveAvailability}>
            <p className="section-kicker">Selected dates</p>
            <div className="availability-selection-mode" role="group" aria-label="Date selection mode">
              <button
                type="button"
                aria-pressed={selectionMode === 'single'}
                onClick={() => { setSelectionMode('single'); setRangeAwaitingEnd(false) }}
              >Single date</button>
              <button
                type="button"
                aria-pressed={selectionMode === 'range'}
                onClick={() => { setSelectionMode('range'); setRangeAwaitingEnd(false) }}
              >Date range</button>
            </div>
            <p className="form-note" aria-live="polite">
              {selectionMode === 'range' && rangeAwaitingEnd
                ? 'Select the end date on the calendar.'
                : 'Choose dates on the calendar or edit the fields below.'}
            </p>
            <label>
              Start date
              <input
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value)
                  if (event.target.value > endDate) setEndDate(event.target.value)
                  setRangeAwaitingEnd(false)
                }}
                required
              />
            </label>
            <label>
              End date
              <input
                type="date"
                min={startDate}
                value={endDate}
                onChange={(event) => { setEndDate(event.target.value); setRangeAwaitingEnd(false) }}
                required
              />
            </label>
            <label>
              Available quantity per day
              <input
                type="number"
                min="0"
                step="1"
                value={totalQuantity}
                onChange={(event) => updateTotalQuantity(event.target.value)}
                required
              />
            </label>
            <p className="form-note">Set quantity to 0 to close these dates. Existing bookings cannot be reduced below the booked quantity.</p>
            {saveError && <p className="error-text" role="alert">{saveError}</p>}
            {notice && <p className="ok-text" role="status">{notice}</p>}
            <button className="button" type="submit" disabled={saving || availabilityLoading}>
              {saving ? 'Saving…' : 'Save availability'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
