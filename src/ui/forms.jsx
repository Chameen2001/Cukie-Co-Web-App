import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useStore } from '../state/store.jsx'
import { fromInputDate, lkr, newId, parseAmount, plainAmount, toInputDate } from '../lib/format.js'
import { DateField, Field, Stepper } from './primitives.jsx'

const DrawerContext = createContext(null)

export function DrawerProvider({ children }) {
  const [drawer, setDrawer] = useState(null)
  const value = useMemo(() => ({
    drawer,
    open: setDrawer,
    close: () => setDrawer(null),
  }), [drawer])

  useEffect(() => {
    if (!drawer) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setDrawer(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawer])

  return <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>
}

export function useDrawer() {
  const value = useContext(DrawerContext)
  if (!value) throw new Error('Drawer missing')
  return value
}

export function DrawerHost() {
  const { drawer, close } = useDrawer()
  if (!drawer) return null
  return (
    <div className="drawer-back" onMouseDown={close}>
      <div className="drawer" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        {drawer.type === 'delivery' && <DeliveryForm />}
        {drawer.type === 'sale' && <SaleForm />}
        {drawer.type === 'settle' && <SettleForm />}
        {drawer.type === 'product' && <ProductForm />}
        {drawer.type === 'customer' && <CustomerForm />}
        {drawer.type === 'marketItem' && <MarketItemForm />}
        {drawer.type === 'purchase' && <PurchaseForm />}
        {drawer.type === 'other' && <OtherExpenseForm />}
      </div>
    </div>
  )
}

function Head({ title }) {
  const { close } = useDrawer()
  return (
    <div className="drawer-head">
      <h2>{title}</h2>
      <button type="button" className="text-btn" onClick={close}>Close</button>
    </div>
  )
}

function DeliveryForm() {
  const store = useStore()
  const { drawer, close } = useDrawer()
  const shops = store.shops
  const initial = shops.some((shop) => shop.id === drawer.customerId) ? drawer.customerId : (shops[0]?.id || '')
  const [customerId, setCustomerId] = useState(initial)
  const [date, setDate] = useState(toInputDate())
  const [notes, setNotes] = useState('')
  const [qty, setQty] = useState({})
  const [saving, setSaving] = useState(false)
  const name = shops.find((shop) => shop.id === customerId)?.name

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    const ok = await store.addDelivery({
      customerId,
      deliveredAt: fromInputDate(date),
      quantities: qty,
      notes: notes.trim(),
    })
    if (ok) close()
    else setSaving(false)
  }

  return (
    <form onSubmit={save}>
      <Head title="Send a batch" />
      <p className="lede">Cookies left with a shop. They pay later, only for what sells.</p>
      {shops.length === 0 ? <p className="form-error">Add a shop in the kitchen first.</p> : (
        <Field label="Shop">
          <select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
            {shops.map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
          </select>
        </Field>
      )}
      <DateField label="Delivered on" value={date} onChange={setDate} />
      {store.activeProducts.map((product) => (
        <div className="qty-row" key={product.id}>
          <div>
            <strong>{product.name}</strong>
            <p className="sub">Sells at {lkr(product.sellPrice)} · costs {lkr(product.costPrice)}</p>
          </div>
          <Stepper value={qty[product.id] || 0} onChange={(value) => setQty((current) => ({ ...current, [product.id]: value }))} />
        </div>
      ))}
      <Field label="Notes">
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Requested yesterday, restock…" />
      </Field>
      <button className="btn full" type="submit" disabled={saving || !customerId}>
        {saving ? 'Saving…' : (name ? `Give this batch to ${name}` : 'Save batch')}
      </button>
    </form>
  )
}

function SaleForm() {
  const store = useStore()
  const { drawer, close } = useDrawer()
  const people = store.directs
  const initial = people.some((person) => person.id === drawer.customerId) ? drawer.customerId : (people[0]?.id || '')
  const [customerId, setCustomerId] = useState(initial)
  const [date, setDate] = useState(toInputDate())
  const [notes, setNotes] = useState('')
  const [qty, setQty] = useState({})
  const [saving, setSaving] = useState(false)
  const due = Object.entries(qty).reduce((sum, [id, quantity]) => {
    const product = store.products.find((entry) => entry.id === id)
    return product && quantity > 0 ? sum + quantity * product.sellPrice : sum
  }, 0)
  const name = people.find((person) => person.id === customerId)?.name

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    const ok = await store.addSale({
      customerId,
      soldAt: fromInputDate(date),
      quantities: qty,
      notes: notes.trim(),
    })
    if (ok) close()
    else setSaving(false)
  }

  return (
    <form onSubmit={save}>
      <Head title="Record a sale" />
      <p className="lede">Neighbors and anyone who pays when they buy. The payment is logged now.</p>
      {people.length === 0 ? <p className="form-error">Add a direct customer in the kitchen first.</p> : (
        <Field label="Customer">
          <select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
            {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </Field>
      )}
      <DateField label="Sold on" value={date} onChange={setDate} />
      {store.activeProducts.map((product) => (
        <div className="qty-row" key={product.id}>
          <div>
            <strong>{product.name}</strong>
            <p className="sub">Sells at {lkr(product.sellPrice)} · costs {lkr(product.costPrice)}</p>
          </div>
          <Stepper value={qty[product.id] || 0} onChange={(value) => setQty((current) => ({ ...current, [product.id]: value }))} />
        </div>
      ))}
      <Field label="Notes">
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Paid cash, ordered yesterday…" />
      </Field>
      <div className="due">
        <span className="sub">They pay</span>
        <b>{lkr(due)}</b>
      </div>
      <button className="btn full" type="submit" disabled={saving || !customerId || due <= 0}>
        {saving ? 'Saving…' : (name ? `Record ${lkr(due)} from ${name}` : 'Save sale')}
      </button>
    </form>
  )
}

function SettleForm() {
  const store = useStore()
  const { drawer, close } = useDrawer()
  const customer = store.customers.find((entry) => entry.id === drawer.customerId)
  const stock = customer ? store.stockFor(customer) : null
  const [date, setDate] = useState(toInputDate())
  const [notes, setNotes] = useState('')
  const [sold, setSold] = useState({})
  const [saving, setSaving] = useState(false)
  const due = stock ? stock.lines.reduce((sum, line) => sum + (sold[line.product.id] || 0) * line.product.sellPrice, 0) : 0

  if (!customer || !stock) return <p>Customer not found.</p>

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    const ok = await store.addSettlement({
      customerId: customer.id,
      settledAt: fromInputDate(date),
      sold,
      notes: notes.trim(),
    })
    if (ok) close()
    else setSaving(false)
  }

  return (
    <form onSubmit={save}>
      <Head title={`Settle ${customer.name}`} />
      <p className="lede">They pay only for cookies sold. Leftovers stay until the next restock.</p>
      <DateField label="Settlement date" value={date} onChange={setDate} />
      {stock.lines.filter((line) => line.remaining > 0).map((line) => {
        const quantity = sold[line.product.id] || 0
        return (
          <div className="sold-row" key={line.product.id}>
            <div>
              <strong>{line.product.name}</strong>
              <p className="sub">{line.remaining} with them · {lkr(line.product.sellPrice)} each</p>
              <p className="sub">Sold {quantity} · leftover {line.remaining - quantity} · {lkr(quantity * line.product.sellPrice)}</p>
            </div>
            <Stepper
              value={quantity}
              max={line.remaining}
              onChange={(value) => setSold((current) => ({ ...current, [line.product.id]: value }))}
            />
          </div>
        )
      })}
      {stock.remainingCookies === 0 ? <p className="empty">Nothing left with this customer to settle.</p> : null}
      <div className="due">
        <span className="sub">They should pay</span>
        <b>{lkr(due)}</b>
      </div>
      <Field label="Notes">
        <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Paid in cash, leftover stays…" />
      </Field>
      <button className="btn full" type="submit" disabled={saving || due <= 0}>
        {saving ? 'Saving…' : `Record ${lkr(due)} received`}
      </button>
    </form>
  )
}

function ProductForm() {
  const store = useStore()
  const { drawer, close } = useDrawer()
  const product = drawer.product
  const [name, setName] = useState(product?.name || '')
  const [cost, setCost] = useState(product ? plainAmount(product.costPrice) : '')
  const [sell, setSell] = useState(product ? plainAmount(product.sellPrice) : '')
  const [archived, setArchived] = useState(product?.archived || false)
  const [saving, setSaving] = useState(false)

  async function save(event) {
    event.preventDefault()
    const costValue = parseAmount(cost) || 0
    const sellValue = parseAmount(sell) || 0
    if (!name.trim() || costValue <= 0 || sellValue <= 0) return
    setSaving(true)
    const ok = await store.saveProduct({
      id: product?.id || newId(),
      name: name.trim(),
      costPrice: costValue,
      sellPrice: sellValue,
      color: product?.color ?? 0xffc4783a,
      createdAt: product?.createdAt || new Date(),
      archived,
    })
    if (ok) close()
    else setSaving(false)
  }

  return (
    <form onSubmit={save}>
      <Head title={product ? 'Edit cookie' : 'New cookie'} />
      <Field label="Name"><input value={name} onChange={(event) => setName(event.target.value)} required /></Field>
      <Field label="Your cost (LKR)"><input inputMode="decimal" value={cost} onChange={(event) => setCost(event.target.value)} required /></Field>
      <Field label="Selling price (LKR)"><input inputMode="decimal" value={sell} onChange={(event) => setSell(event.target.value)} required /></Field>
      {product ? (
        <label className="check">
          <input type="checkbox" checked={archived} onChange={(event) => setArchived(event.target.checked)} />
          Hide from new batches
        </label>
      ) : null}
      <button className="btn full" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save cookie'}</button>
    </form>
  )
}

function CustomerForm() {
  const store = useStore()
  const { drawer, close } = useDrawer()
  const customer = drawer.customer
  const [name, setName] = useState(customer?.name || '')
  const [notes, setNotes] = useState(customer?.notes || '')
  const [kind, setKind] = useState(customer?.kind || 'direct')
  const [saving, setSaving] = useState(false)

  async function save(event) {
    event.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const ok = await store.saveCustomer({
      id: customer?.id || newId(),
      name: name.trim(),
      notes: notes.trim(),
      createdAt: customer?.createdAt || new Date(),
      kind,
    })
    if (ok) close()
    else setSaving(false)
  }

  return (
    <form onSubmit={save}>
      <Head title={customer ? 'Edit customer' : 'New customer'} />
      <Field label="Name"><input value={name} onChange={(event) => setName(event.target.value)} required /></Field>
      <Field label="How they pay">
        <select value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="consignment">Shop — pays later for sold cookies</option>
          <option value="direct">Direct — pays when they buy</option>
        </select>
      </Field>
      <Field label="Notes">
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Next door, restock when empty…" />
      </Field>
      <button className="btn full" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save customer'}</button>
    </form>
  )
}

function MarketItemForm() {
  const store = useStore()
  const { drawer, close } = useDrawer()
  const item = drawer.item
  const [name, setName] = useState(item?.name || '')
  const [unit, setUnit] = useState(item?.unit || '')
  const [price, setPrice] = useState(item?.usualPrice > 0 ? plainAmount(item.usualPrice) : '')
  const [saving, setSaving] = useState(false)

  async function save(event) {
    event.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const ok = await store.saveMarketItem({
      id: item?.id || newId(),
      name: name.trim(),
      unit: unit.trim(),
      usualPrice: parseAmount(price) || 0,
      createdAt: item?.createdAt || new Date(),
      lastBoughtAt: item?.lastBoughtAt || null,
    })
    if (ok) close()
    else setSaving(false)
  }

  return (
    <form onSubmit={save}>
      <Head title={item ? 'Edit item' : 'New supermarket item'} />
      <Field label="Item name"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Flour, butter, chocolate chips…" required /></Field>
      <Field label="Pack size"><input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="1 kg, tray, bottle…" /></Field>
      <Field label="Usual price (LKR)"><input inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Leave empty until the first buy" /></Field>
      <button className="btn full" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save item'}</button>
      {item ? (
        <button
          className="btn ghost full"
          type="button"
          style={{ marginTop: 8 }}
          onClick={async () => {
            await store.deleteMarketItem(item.id)
            close()
          }}
        >
          Delete item
        </button>
      ) : null}
    </form>
  )
}

function PurchaseForm() {
  const store = useStore()
  const { drawer, close } = useDrawer()
  const item = drawer.item
  const [amount, setAmount] = useState(item.usualPrice > 0 ? plainAmount(item.usualPrice) : '')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function save(event) {
    event.preventDefault()
    const value = parseAmount(amount) || 0
    if (value <= 0) return
    setSaving(true)
    const ok = await store.addMarketExpense({
      item,
      amount: value,
      spentAt: drawer.spentAt,
      notes: notes.trim(),
    })
    if (!ok) {
      setSaving(false)
      return
    }
    drawer.onAdded?.(`${item.name} · ${lkr(value)}`)
    close()
  }

  return (
    <form onSubmit={save}>
      <Head title={item.name} />
      {item.unit ? <p className="sub">{item.unit}</p> : null}
      <p className="lede">{item.usualPrice > 0 ? `Last paid ${lkr(item.usualPrice)}. Change it if the price moved.` : 'Enter what you paid. The next trip will remember it.'}</p>
      <Field label="Amount (LKR)"><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} autoFocus required /></Field>
      <Field label="Notes"><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Keells, promo, 2 packs…" /></Field>
      <button className="btn full" type="submit" disabled={saving}>{saving ? 'Saving…' : `Add ${item.name}`}</button>
    </form>
  )
}

function OtherExpenseForm() {
  const store = useStore()
  const { drawer, close } = useDrawer()
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  async function save(event) {
    event.preventDefault()
    const value = parseAmount(amount) || 0
    if (!title.trim() || value <= 0) return
    setSaving(true)
    const savedTitle = title.trim()
    const ok = await store.addExpense({
      id: newId(),
      spentAt: drawer.spentAt,
      amount: value,
      title: savedTitle,
      notes: '',
      createdAt: new Date(),
      marketItemId: null,
    })
    if (!ok) {
      setSaving(false)
      return
    }
    drawer.onAdded?.(`${savedTitle} · ${lkr(value)}`)
    close()
  }

  return (
    <form onSubmit={save}>
      <Head title="Other spend" />
      <Field label="What was it?"><input value={title} onChange={(event) => setTitle(event.target.value)} required /></Field>
      <Field label="Amount (LKR)"><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required /></Field>
      <button className="btn full" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add expense'}</button>
    </form>
  )
}
