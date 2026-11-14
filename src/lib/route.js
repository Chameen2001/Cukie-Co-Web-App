import { useEffect, useState } from 'react'

export function parseRoute(hash) {
  const path = (hash || '#/desk').replace(/^#/, '') || '/desk'
  const parts = path.split('/').filter(Boolean)
  const head = parts[0] || 'desk'
  if (head === 'people' && parts[1]) return { name: 'person', id: decodeURIComponent(parts[1]) }
  if (head === 'people') return { name: 'people' }
  if (head === 'till' || head === 'market' || head === 'kitchen' || head === 'desk') return { name: head }
  return { name: 'desk' }
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash))
  useEffect(() => {
    const sync = () => setRoute(parseRoute(window.location.hash))
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  return route
}
