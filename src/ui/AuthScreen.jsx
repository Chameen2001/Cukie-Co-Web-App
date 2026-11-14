import { useEffect, useState } from 'react'
import { useStore } from '../state/store.jsx'

export function AuthScreen() {
  const store = useStore()
  useEffect(() => {
    document.title = 'Cukie Co'
  }, [])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [register, setRegister] = useState(false)
  const [localError, setLocalError] = useState('')
  const message = localError || store.authError

  function submit(event) {
    event.preventDefault()
    const mail = email.trim()
    if (!mail || !password) {
      setLocalError('Enter email and password.')
      return
    }
    setLocalError('')
    if (register) store.register(mail, password)
    else store.signIn(mail, password)
  }

  return (
    <div className="auth">
      <section className="auth-brand">
        <p className="kicker">Cookie ledger</p>
        <h1>
          <span className="logo" aria-hidden="true" />
          <span className="sr-only">Cukie Co</span>
        </h1>
        <p>Shops that pay later, neighbors who pay now, and the supermarket run that sits between them. Same account as the iPhone app.</p>
        <ul className="brand-points">
          <li>Shops keep the cookies and pay for what sold.</li>
          <li>Neighbors pay when the box changes hands.</li>
          <li>The last supermarket price is remembered.</li>
        </ul>
      </section>
      <form className="auth-panel" onSubmit={submit}>
        <FieldLike label="Email">
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </FieldLike>
        <FieldLike label="Password">
          <input
            type="password"
            autoComplete={register ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </FieldLike>
        {message ? <p className="form-error">{message}</p> : null}
        <button className="btn full" type="submit" disabled={store.authBusy}>
          {store.authBusy ? 'Please wait…' : (register ? 'Create account' : 'Log in')}
        </button>
        <button
          className="switch"
          type="button"
          onClick={() => {
            setRegister((value) => !value)
            setLocalError('')
            store.clearAuthError()
          }}
        >
          {register ? 'Already have an account? Log in' : 'New here? Create an account'}
        </button>
      </form>
    </div>
  )
}

function FieldLike({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}
