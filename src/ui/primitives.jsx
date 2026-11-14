import { dateBounds } from '../lib/format.js'

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function DateField({ label, value, onChange }) {
  const bounds = dateBounds()
  return (
    <Field label={label}>
      <input type="date" value={value} min={bounds.min} max={bounds.max} onChange={(event) => onChange(event.target.value)} required />
    </Field>
  )
}

export function Stepper({ value, max, onChange }) {
  const atMax = max != null && value >= max
  return (
    <div className="stepper">
      <button type="button" aria-label="Decrease" disabled={value <= 0} onClick={() => onChange(Math.max(0, value - 1))}>−</button>
      <b>{value}</b>
      <button type="button" aria-label="Increase" disabled={atMax} onClick={() => onChange(max == null ? value + 1 : Math.min(max, value + 1))}>+</button>
    </div>
  )
}

export function PageHead({ kicker, title, lede, children }) {
  return (
    <div className="page-head">
      <div>
        <p className="kicker">{kicker}</p>
        <h1>{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
      </div>
      {children}
    </div>
  )
}

export function Confirm({ title, body, confirmLabel = 'Delete', onYes, onNo }) {
  return (
    <div className="confirm-back" onMouseDown={onNo}>
      <div className="confirm" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <h2>{title}</h2>
        <p>{body}</p>
        <div className="confirm-actions">
          <button type="button" className="btn ghost" onClick={onNo}>Cancel</button>
          <button type="button" className="btn danger" onClick={onYes}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
