import { StoreProvider, useStore } from './state/store.jsx'
import { AuthScreen } from './ui/AuthScreen.jsx'
import { Shell } from './ui/Shell.jsx'

function Gate() {
  const store = useStore()
  if (!store.ready) return <div className="boot">Opening the desk…</div>
  if (!store.session) return <AuthScreen />
  if (store.loading && store.products.length === 0 && !store.error) {
    return <div className="boot">Loading the ledger…</div>
  }
  if (store.error && store.products.length === 0) {
    return (
      <div className="full-error">
        <div>
          <h1>The ledger didn’t load</h1>
          <p>{store.error}</p>
          <button type="button" className="btn" onClick={() => store.reload()}>Try again</button>
          <button type="button" className="btn ghost" style={{ marginLeft: 8 }} onClick={store.signOut}>Sign out</button>
        </div>
      </div>
    )
  }
  return <Shell />
}

export default function App() {
  return (
    <StoreProvider>
      <Gate />
    </StoreProvider>
  )
}
