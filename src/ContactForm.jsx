import { useState } from 'react'
import { segments } from './data.js'

const empty = { segment: 'OEM', name: '', email: '', phone: '', company: '', message: '', consent: false, website: '' }

// Client-side rules. Server-side validation must repeat these in production.
function validate(v) {
  const e = {}
  if (v.name.trim().length < 2) e.name = 'Enter your full name (at least 2 characters).'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) e.email = 'Enter a valid email, for example name@company.com.'
  if (v.phone && !/^\+?[0-9\s-]{7,15}$/.test(v.phone)) e.phone = 'Use 7 to 15 digits. A leading + is allowed.'
  if (v.company.trim().length < 2) e.company = 'Enter your organisation name.'
  if (v.message.trim().length < 20) e.message = 'Tell us a little more (at least 20 characters).'
  if (v.message.length > 1000) e.message = 'Keep the message under 1000 characters.'
  if (!v.consent) e.consent = 'Please agree to the data use notice to continue.'
  return e
}

// Set VITE_FORM_ENDPOINT to your PHP/Formspree/Netlify endpoint. Without it, the form simulates success.
async function send(values) {
  const url = import.meta.env.VITE_FORM_ENDPOINT
  if (!url) return new Promise(r => setTimeout(r, 700))
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
  if (!res.ok) throw new Error('Request failed')
}

export default function ContactForm() {
  const [v, setV] = useState(empty)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [status, setStatus] = useState('idle')

  const set = (k, val) => {
    const next = { ...v, [k]: val }
    setV(next)
    if (touched[k]) setErrors(validate(next))
  }
  const blur = k => { setTouched(t => ({ ...t, [k]: true })); setErrors(validate(v)) }
  const err = k => touched[k] && errors[k]

  async function submit(ev) {
    ev.preventDefault()
    const found = validate(v)
    setErrors(found)
    setTouched({ name: 1, email: 1, phone: 1, company: 1, message: 1, consent: 1 })
    if (Object.keys(found).length || v.website) return // honeypot: bots fill the hidden field
    setStatus('sending')
    try { await send(v); setStatus('done'); setV(empty); setTouched({}) } catch { setStatus('error') }
  }

  if (status === 'done') {
    return (
      <div className="form-card" role="status">
        <h3>Thanks, we have your enquiry.</h3>
        <p>Our partnerships team will reply within two working days.</p>
        <button className="btn" onClick={() => setStatus('idle')}>Send another enquiry</button>
      </div>
    )
  }

  const field = (k, label, props = {}) => (
    <div className={'field' + (err(k) ? ' bad' : '')}>
      <label htmlFor={k}>{label}</label>
      <input id={k} value={v[k]} onChange={e => set(k, e.target.value)} onBlur={() => blur(k)}
        aria-invalid={!!err(k)} aria-describedby={err(k) ? k + '-e' : undefined} {...props} />
      {err(k) && <span className="msg" id={k + '-e'}>{errors[k]}</span>}
    </div>
  )

  return (
    <form className="form-card" onSubmit={submit} noValidate>
      <fieldset className="seg">
        <legend>I am a</legend>
        {segments.map(s => (
          <label key={s} className={v.segment === s ? 'on' : ''}>
            <input type="radio" name="segment" checked={v.segment === s} onChange={() => set('segment', s)} />{s}
          </label>
        ))}
      </fieldset>
      <div className="row">
        {field('name', 'Full name', { autoComplete: 'name' })}
        {field('company', 'Organisation', { autoComplete: 'organization' })}
      </div>
      <div className="row">
        {field('email', 'Work email', { type: 'email', autoComplete: 'email' })}
        {field('phone', 'Phone (optional)', { type: 'tel', autoComplete: 'tel' })}
      </div>
      <div className={'field' + (err('message') ? ' bad' : '')}>
        <label htmlFor="message">How would you like to partner with us?</label>
        <textarea id="message" rows="4" value={v.message} onChange={e => set('message', e.target.value)} onBlur={() => blur('message')}
          aria-invalid={!!err('message')} />
        <span className="count">{v.message.length}/1000</span>
        {err('message') && <span className="msg">{errors.message}</span>}
      </div>
      <input className="hp" tabIndex="-1" autoComplete="off" aria-hidden="true" value={v.website} onChange={e => set('website', e.target.value)} />
      <div className={'field check' + (err('consent') ? ' bad' : '')}>
        <label>
          <input type="checkbox" checked={v.consent} onChange={e => set('consent', e.target.checked)} onBlur={() => blur('consent')} />
          I agree that Giga Mines may use these details to reply to my enquiry, as described in the privacy notice (DPDP Act 2023).
        </label>
        {err('consent') && <span className="msg">{errors.consent}</span>}
      </div>
      {status === 'error' && <p className="msg" role="alert">Something went wrong. Please try again.</p>}
      <button className="btn" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Send enquiry'}</button>
    </form>
  )
}
