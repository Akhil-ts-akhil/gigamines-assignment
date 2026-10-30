import { useEffect, useRef, useState } from 'react'
import ContactForm from './ContactForm.jsx'
import { nav, zones, elements, stats, industries, news } from './data.js'

// Dot particles on the hero canvas. Skipped when the visitor prefers reduced motion.
function Particles() {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current, ctx = c.getContext('2d')
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf, pts = []
    const fit = () => {
      c.width = c.offsetWidth; c.height = c.offsetHeight
      pts = Array.from({ length: Math.min(70, Math.floor(c.width / 16)) }, () => ({
        x: Math.random() * c.width, y: Math.random() * c.height,
        vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35 }))
    }
    const tick = () => {
      ctx.clearRect(0, 0, c.width, c.height)
      pts.forEach((p, i) => {
        p.x = (p.x + p.vx + c.width) % c.width; p.y = (p.y + p.vy + c.height) % c.height
        ctx.fillStyle = '#2E87C6'; ctx.fillRect(p.x, p.y, 2, 2)
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(p.x - pts[j].x, p.y - pts[j].y)
          if (d < 110) { ctx.strokeStyle = `rgba(46,135,198,${.35 * (1 - d / 110)})`; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke() }
        }
      })
      raf = requestAnimationFrame(tick)
    }
    fit(); tick(); window.addEventListener('resize', fit)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', fit) }
  }, [])
  return <canvas ref={ref} className="particles" aria-hidden="true" />
}

function CountUp({ to }) {
  const ref = useRef(null)
  const [n, setN] = useState(0)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const step = t => { const k = Math.min((t - t0) / 1200, 1); setN(Math.round(to * k)); if (k < 1) requestAnimationFrame(step) }
      requestAnimationFrame(step)
    })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [to])
  return <span ref={ref}>{to ? n : '—'}</span>
}

function Header() {
  const [open, setOpen] = useState(false)
  return (
    <header className="hdr">
      <a className="logo" href="#top"><span className="mark" aria-hidden="true" />Giga Mines</a>
      <button className="burger" aria-expanded={open} aria-label="Menu" onClick={() => setOpen(!open)}>☰</button>
      <nav className={open ? 'open' : ''} onClick={() => setOpen(false)}>
        {nav.map(([t, h]) => <a key={h} href={h}>{t}</a>)}
        <a className="btn sm" href="#partner">Partner with Us</a>
      </nav>
    </header>
  )
}

function Inside() {
  const [z, setZ] = useState(zones[0])
  return (
    <section id="inside" className="sec blueprint">
      <div className="wrap">
        <h2>Inside Giga Mines</h2>
        <p className="lead">Six zones, one connected flow. Select a zone to see what happens there.</p>
        <div className="plan">
          <div className="zones" role="tablist" aria-label="Giga Mines zones">
            {zones.map(x => (
              <button key={x.id} role="tab" aria-selected={z.id === x.id} className={z.id === x.id ? 'on' : ''} onClick={() => setZ(x)}>{x.name}</button>
            ))}
          </div>
          <div className="zone-detail" role="tabpanel" key={z.id}>
            <h3>{z.name}</h3><p>{z.text}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function App() {
  return (
    <>
      <Header />
      <main id="top">
        <section className="hero">
          <Particles />
          <div className="wrap hero-in">
            <p className="tagline">Recycle | Recovery | Refine — Extracting What Matters</p>
            <h1>Building Global Supply Chains of <em>Critical Minerals &amp; Rare Earth Elements</em></h1>
            <p className="lead">India's first giga-scale complex to recycle, recover and refine the minerals behind clean energy and advanced manufacturing.</p>
            <a className="btn" href="#partner">Partner with Us</a>
          </div>
        </section>

        <section className="trust">
          <div className="wrap logos" aria-label="Partners (logos pending permission)">
            {['Partner logo', 'Partner logo', 'Partner logo', 'Partner logo', 'Partner logo'].map((t, i) => <span key={i}>{t}</span>)}
          </div>
        </section>

        <section id="why" className="sec">
          <div className="wrap split">
            <h2>India imports almost all of the minerals its future runs on</h2>
            <p>Batteries, magnets and electronics depend on a small set of critical minerals and rare earth elements. Supply is concentrated in a few countries, and the used products that hold these metals today are mostly lost. Giga Mines recovers them at scale, at home.</p>
          </div>
        </section>

        <section id="model" className="sec alt">
          <div className="wrap">
            <h2>Recycle · Recovery · Refine</h2>
            <div className="grid3">
              {[['Recycle', 'Take in end-of-life batteries, magnets and e-waste as feed.'],
                ['Recovery', 'Separate and extract the valuable metals from that feed.'],
                ['Refine', 'Purify them to specification for OEMs and manufacturers.']].map(([t, d]) =>
                <article key={t} className="card"><h3>{t}</h3><p>{d}</p></article>)}
            </div>
          </div>
        </section>

        <Inside />

        <section id="tech" className="sec">
          <div className="wrap">
            <h2>Technology</h2>
            <div className="grid2">
              <article className="card"><span className="pill live">Commercial</span><h3>HHM battery recycling</h3><p>Recovers lithium, cobalt, nickel and manganese from spent batteries. Full process name to be confirmed.</p></article>
              <article className="card"><span className="pill">Pilot</span><h3>Magnet recycling</h3><p>Recovers neodymium, praseodymium, dysprosium and terbium from end-of-life magnets.</p></article>
            </div>
          </div>
        </section>

        <section id="elements" className="sec alt">
          <div className="wrap">
            <h2>Elements we recover</h2>
            <p className="lead">Highlighted tiles are in focus. The final list is to be confirmed.</p>
            <ul className="ptable">
              {elements.map(([s, n, on]) => <li key={s} className={on ? 'on' : ''} title={n}><b>{s}</b><small>{n}</small></li>)}
            </ul>
          </div>
        </section>

        <section className="sec dark">
          <div className="wrap grid4">
            {stats.map((s, i) => <div key={i} className="stat"><strong><CountUp to={s.v} /></strong><span>{s.label}</span></div>)}
          </div>
        </section>

        <section className="sec">
          <div className="wrap">
            <h2>Industries we serve</h2>
            <ul className="chips">{industries.map(i => <li key={i}>{i}</li>)}</ul>
          </div>
        </section>

        <section id="impact" className="sec alt">
          <div className="wrap split">
            <h2>Every tonne recovered is a tonne not mined</h2>
            <p>Recycling keeps critical minerals in circulation, cuts import dependence and lowers the footprint of new mining. Verified impact figures will be added here.</p>
          </div>
        </section>

        <section className="sec">
          <div className="wrap">
            <h2>News</h2>
            <div className="grid3">
              {news.map((n, i) => <article key={i} className="card"><small>{n.d}</small><h3>{n.t}</h3></article>)}
            </div>
          </div>
        </section>

        <section id="partner" className="sec dark">
          <div className="wrap split">
            <div>
              <h2>Partner with Us</h2>
              <p className="lead">OEM, feed supplier, investor or research partner: tell us what you need and we will respond within two working days.</p>
            </div>
            <ContactForm />
          </div>
        </section>
      </main>

      <footer className="ftr">
        <div className="wrap">
          <p><b>Giga Mines</b> is a vertical of MiniMines Cleantech Solutions Pvt. Ltd.</p>
          <p><a href="#top">LinkedIn</a> · <a href="#top">X</a> · <a href="#top">Privacy</a> · <a href="#top">Terms</a></p>
          <small>© {new Date().getFullYear()} MiniMines Cleantech Solutions Pvt. Ltd.</small>
        </div>
      </footer>
    </>
  )
}
