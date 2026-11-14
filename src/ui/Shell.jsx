import { useEffect } from 'react'
import { useStore } from '../state/store.jsx'
import { useRoute } from '../lib/route.js'
import { DrawerHost, DrawerProvider } from './forms.jsx'
import { Desk, Kitchen, Market, People, Till } from './screens.jsx'

const links = [
  { href: '#/desk', name: 'desk', label: 'Desk' },
  { href: '#/people', name: 'people', label: 'People' },
  { href: '#/till', name: 'till', label: 'Till' },
  { href: '#/kitchen', name: 'kitchen', label: 'Kitchen' },
]

function activeName(route) {
  if (route.name === 'person') return 'people'
  if (route.name === 'market') return 'till'
  return route.name
}

export function Shell() {
  return (
    <DrawerProvider>
      <Frame />
      <DrawerHost />
    </DrawerProvider>
  )
}

function Frame() {
  const store = useStore()
  const route = useRoute()
  const current = activeName(route)
  const titles = { desk: 'Desk', people: 'People', person: 'People', till: 'Till', kitchen: 'Kitchen', market: 'Market run' }

  useEffect(() => {
    document.title = `${titles[route.name] || 'Desk'} · Cukie Co`
  }, [route.name])

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <a className="brand" href="#/desk" aria-label="Cukie Co"><span className="logo" /></a>
        <nav className="side-nav" aria-label="Primary">
          {links.map((link) => (
            <a key={link.name} className={current === link.name ? 'side-link active' : 'side-link'} href={link.href}>{link.label}</a>
          ))}
        </nav>
        <div className="side-foot">
          <p>{store.session?.email}</p>
          <button type="button" className="text-btn" onClick={() => store.reload()}>Refresh</button>
          <button type="button" className="text-btn" onClick={store.signOut}>Sign out</button>
        </div>
      </aside>
      <main className="stage">
        <header className="topbar">
          <a className="brand" href="#/desk" aria-label="Cukie Co"><span className="logo" /></a>
          <button type="button" className="text-btn" onClick={store.signOut}>Sign out</button>
        </header>
        {route.name === 'people' || route.name === 'person' ? <People /> : null}
        {route.name === 'till' ? <Till /> : null}
        {route.name === 'kitchen' ? <Kitchen /> : null}
        {route.name === 'market' ? <Market /> : null}
        {route.name === 'desk' ? <Desk /> : null}
        {store.notice ? (
          <div className="toast" role="status">
            <p>{store.notice}</p>
            <button type="button" onClick={store.clearNotice}>Close</button>
          </div>
        ) : null}
      </main>
      <nav className="nav-mobile" aria-label="Primary">
        {links.map((link) => (
          <a key={link.name} className={current === link.name ? 'tab-link active' : 'tab-link'} href={link.href}>{link.label}</a>
        ))}
      </nav>
    </div>
  )
}
