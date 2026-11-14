const PROJECT = 'track-my-sales-63b5e'
const KEY_STORE = 'cukie.apiKey'

function configuredKeys() {
  return String(import.meta.env.VITE_FIREBASE_API_KEY || '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean)
}

function rememberedKey() {
  const keys = [
    'AIzaSyDnrhBc4I0cjg72MnUhM0o7O52zBilxWf8',
    'AIzaSyDSBuyomqWzmfJZELxDBX3XI9A1RmKV0WA',
  ]
  const saved = localStorage.getItem(KEY_STORE)
  if (saved && keys.includes(saved)) return [saved, ...keys.filter((key) => key !== saved)]
  return keys
}

function rememberKey(key) {
  localStorage.setItem(KEY_STORE, key)
}

function friendly(raw, status) {
  const code = String(raw || '').toUpperCase()
  if (code.includes('INVALID_LOGIN') || code.includes('INVALID_PASSWORD') || code.includes('EMAIL_NOT_FOUND') || code.includes('INVALID_CREDENTIAL')) {
    return 'Email or password is wrong.'
  }
  if (code.includes('EMAIL_EXISTS')) return 'That email already has an account. Log in.'
  if (code.includes('WEAK_PASSWORD')) return 'Use at least 6 characters for the password.'
  if (code.includes('INVALID_EMAIL')) return 'Enter a valid email address.'
  if (code.includes('TOO_MANY_ATTEMPTS')) return 'Too many attempts. Wait a moment and try again.'
  if (code.includes('API_KEY') || code.includes('REFERRER') || code.includes('BLOCKED')) {
    return 'Firebase blocked this browser. Allow this site on the Track My Sales API key, or add a web app in that Firebase project.'
  }
  if (code.includes('PERMISSION_DENIED')) return 'This account cannot read the ledger yet.'
  if (!raw) return 'Could not reach the cloud.'
  return String(raw).replaceAll('_', ' ')
}

function isKeyBlock(message) {
  const code = message.toUpperCase()
  return code.includes('API_KEY') || code.includes('REFERRER') || code.includes('BLOCKED') || code.includes('FIREBASE BLOCKED')
}

async function request(url, options) {
  let response
  try {
    response = await fetch(url, { cache: 'no-store', ...options })
  } catch {
    throw new Error('No internet. Check the connection and try again.')
  }
  const text = await response.text()
  let data = {}
  if (text) {
    try { data = JSON.parse(text) } catch { data = {} }
  }
  if (!response.ok) {
    throw new Error(friendly(data?.error?.message || '', response.status))
  }
  return data
}

async function withKey(buildUrl, options) {
  const keys = rememberedKey()
  if (!keys.length) {
    throw new Error('This build has no Firebase web API key.')
  }
  let last = new Error('Could not reach the cloud.')
  for (const key of keys) {
    try {
      const data = await request(buildUrl(key), options)
      rememberKey(key)
      return data
    } catch (error) {
      last = error
      if (!isKeyBlock(error.message)) throw error
    }
  }
  throw last
}

function millis(date) {
  return date instanceof Date ? date.getTime() : new Date(date).getTime()
}

const str = (value) => ({ stringValue: value ?? '' })
const int = (value) => ({ integerValue: String(value ?? 0) })
const dbl = (value) => ({ doubleValue: Number(value) || 0 })
const arr = (values) => ({ arrayValue: { values } })
const map = (fields) => ({ mapValue: { fields } })

function readString(value) {
  return value?.stringValue ?? null
}

function readInt(value) {
  if (value?.integerValue != null && value.integerValue !== '') return Number(value.integerValue)
  if (value?.doubleValue != null) return Math.trunc(Number(value.doubleValue))
  return null
}

function readDouble(value) {
  if (value?.doubleValue != null) return Number(value.doubleValue)
  if (value?.integerValue != null && value.integerValue !== '') return Number(value.integerValue)
  return 0
}

function readDate(value) {
  const n = readInt(value)
  return n == null ? new Date() : new Date(n)
}

function readBoolInt(value) {
  if (readInt(value) === 1) return true
  if (value?.booleanValue === true) return true
  return false
}

function mapsOf(value) {
  return (value?.arrayValue?.values || []).map((entry) => entry.mapValue?.fields || {})
}

function docId(name) {
  return String(name || '').split('/').pop() || ''
}

export function productFields(product) {
  return {
    id: str(product.id),
    name: str(product.name),
    cost_price: dbl(product.costPrice),
    sell_price: dbl(product.sellPrice),
    color: int(product.color),
    created_at: int(millis(product.createdAt)),
    archived: int(product.archived ? 1 : 0),
  }
}

export function customerFields(customer) {
  return {
    id: str(customer.id),
    name: str(customer.name),
    notes: str(customer.notes || ''),
    created_at: int(millis(customer.createdAt)),
    kind: str(customer.kind === 'direct' ? 'direct' : 'consignment'),
  }
}

export function marketFields(item) {
  const fields = {
    id: str(item.id),
    name: str(item.name),
    usual_price: dbl(item.usualPrice),
    unit: str(item.unit || ''),
    created_at: int(millis(item.createdAt)),
  }
  if (item.lastBoughtAt) fields.last_bought_at = int(millis(item.lastBoughtAt))
  return fields
}

export function expenseFields(expense) {
  const fields = {
    id: str(expense.id),
    spent_at: int(millis(expense.spentAt)),
    amount: dbl(expense.amount),
    title: str(expense.title),
    notes: str(expense.notes || ''),
    created_at: int(millis(expense.createdAt)),
  }
  if (expense.marketItemId) fields.market_item_id = str(expense.marketItemId)
  return fields
}

export function deliveryFields(delivery) {
  return {
    id: str(delivery.id),
    customer_id: str(delivery.customerId),
    delivered_at: int(millis(delivery.deliveredAt)),
    notes: str(delivery.notes || ''),
    created_at: int(millis(delivery.createdAt)),
    items: arr(delivery.items.map((item) => map({
      id: str(item.id),
      delivery_id: str(item.deliveryId),
      product_id: str(item.productId),
      quantity: int(item.quantity),
      cost_price: dbl(item.costPrice),
      sell_price: dbl(item.sellPrice),
    }))),
  }
}

export function settlementFields(settlement) {
  return {
    id: str(settlement.id),
    customer_id: str(settlement.customerId),
    settled_at: int(millis(settlement.settledAt)),
    amount_received: dbl(settlement.amountReceived),
    notes: str(settlement.notes || ''),
    created_at: int(millis(settlement.createdAt)),
    items: arr(settlement.items.map((item) => map({
      id: str(item.id),
      settlement_id: str(item.settlementId),
      product_id: str(item.productId),
      quantity_sold: int(item.quantitySold),
      cost_price: dbl(item.costPrice),
      sell_price: dbl(item.sellPrice),
    }))),
  }
}

export function saleFields(sale) {
  return {
    id: str(sale.id),
    customer_id: str(sale.customerId),
    sold_at: int(millis(sale.soldAt)),
    amount_received: dbl(sale.amountReceived),
    notes: str(sale.notes || ''),
    created_at: int(millis(sale.createdAt)),
    items: arr(sale.items.map((item) => map({
      id: str(item.id),
      sale_id: str(item.saleId),
      product_id: str(item.productId),
      quantity: int(item.quantity),
      cost_price: dbl(item.costPrice),
      sell_price: dbl(item.sellPrice),
    }))),
  }
}

function decodeProduct(doc) {
  const fields = doc.fields
  if (!fields?.name) return null
  return {
    id: docId(doc.name),
    name: readString(fields.name),
    costPrice: readDouble(fields.cost_price),
    sellPrice: readDouble(fields.sell_price),
    color: readInt(fields.color) ?? 0xffc4783a,
    createdAt: readDate(fields.created_at),
    archived: readBoolInt(fields.archived),
  }
}

function decodeCustomer(doc) {
  const fields = doc.fields
  if (!fields?.name) return null
  return {
    id: docId(doc.name),
    name: readString(fields.name),
    notes: readString(fields.notes) || '',
    createdAt: readDate(fields.created_at),
    kind: readString(fields.kind) === 'direct' ? 'direct' : 'consignment',
  }
}

function decodeMarket(doc) {
  const fields = doc.fields
  if (!fields?.name) return null
  return {
    id: docId(doc.name),
    name: readString(fields.name),
    usualPrice: readDouble(fields.usual_price),
    unit: readString(fields.unit) || '',
    createdAt: readDate(fields.created_at),
    lastBoughtAt: fields.last_bought_at ? readDate(fields.last_bought_at) : null,
  }
}

function decodeExpense(doc) {
  const fields = doc.fields
  if (!fields?.title) return null
  return {
    id: docId(doc.name),
    spentAt: readDate(fields.spent_at),
    amount: readDouble(fields.amount),
    title: readString(fields.title),
    notes: readString(fields.notes) || '',
    createdAt: readDate(fields.created_at),
    marketItemId: readString(fields.market_item_id),
  }
}

function decodeDelivery(doc) {
  const fields = doc.fields
  if (!fields) return null
  const id = docId(doc.name)
  return {
    id,
    customerId: readString(fields.customer_id) || '',
    deliveredAt: readDate(fields.delivered_at),
    notes: readString(fields.notes) || '',
    createdAt: readDate(fields.created_at),
    items: mapsOf(fields.items).filter((item) => item.product_id).map((item) => ({
      id: readString(item.id) || crypto.randomUUID(),
      deliveryId: readString(item.delivery_id) || id,
      productId: readString(item.product_id),
      quantity: readInt(item.quantity) || 0,
      costPrice: readDouble(item.cost_price),
      sellPrice: readDouble(item.sell_price),
    })),
  }
}

function decodeSettlement(doc) {
  const fields = doc.fields
  if (!fields) return null
  const id = docId(doc.name)
  return {
    id,
    customerId: readString(fields.customer_id) || '',
    settledAt: readDate(fields.settled_at),
    amountReceived: readDouble(fields.amount_received),
    notes: readString(fields.notes) || '',
    createdAt: readDate(fields.created_at),
    items: mapsOf(fields.items).filter((item) => item.product_id).map((item) => ({
      id: readString(item.id) || crypto.randomUUID(),
      settlementId: readString(item.settlement_id) || id,
      productId: readString(item.product_id),
      quantitySold: readInt(item.quantity_sold) || 0,
      costPrice: readDouble(item.cost_price),
      sellPrice: readDouble(item.sell_price),
    })),
  }
}

function decodeSale(doc) {
  const fields = doc.fields
  if (!fields) return null
  const id = docId(doc.name)
  const items = mapsOf(fields.items).filter((item) => item.product_id).map((item) => ({
    id: readString(item.id) || crypto.randomUUID(),
    saleId: readString(item.sale_id) || id,
    productId: readString(item.product_id),
    quantity: readInt(item.quantity) || 0,
    costPrice: readDouble(item.cost_price),
    sellPrice: readDouble(item.sell_price),
  }))
  return {
    id,
    customerId: readString(fields.customer_id) || '',
    soldAt: readDate(fields.sold_at),
    amountReceived: readDouble(fields.amount_received),
    notes: readString(fields.notes) || '',
    createdAt: readDate(fields.created_at),
    items,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
  }
}

function base(uid, collection) {
  return `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}/${collection}`
}

function resource(uid, collection, id) {
  return `projects/${PROJECT}/databases/(default)/documents/users/${uid}/${collection}/${id}`
}

async function listCollection(uid, token, collection) {
  const documents = []
  let page = ''
  do {
    const url = new URL(base(uid, collection))
    url.searchParams.set('pageSize', '300')
    if (page) url.searchParams.set('pageToken', page)
    const data = await request(url, { headers: { Authorization: `Bearer ${token}` } })
    documents.push(...(data.documents || []))
    page = data.nextPageToken || ''
  } while (page)
  return documents
}

export async function signIn(email, password) {
  return authenticate('accounts:signInWithPassword', email, password)
}

export async function register(email, password) {
  return authenticate('accounts:signUp', email, password)
}

async function authenticate(endpoint, email, password) {
  const data = await withKey(
    (key) => `https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  )
  return {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    uid: data.localId,
    email: data.email || email,
    expiresAt: Date.now() + Number(data.expiresIn || 3600) * 1000,
  }
}

export async function refresh(session) {
  const data = await withKey(
    (key) => `https://securetoken.googleapis.com/v1/token?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken,
      }),
    },
  )
  return {
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    uid: data.user_id,
    email: session.email,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
  }
}

export async function fetchLedger(uid, token) {
  const [products, customers, deliveries, settlements, expenses, marketItems, sales] = await Promise.all([
    listCollection(uid, token, 'products'),
    listCollection(uid, token, 'customers'),
    listCollection(uid, token, 'deliveries'),
    listCollection(uid, token, 'settlements'),
    listCollection(uid, token, 'expenses'),
    listCollection(uid, token, 'market_items'),
    listCollection(uid, token, 'sales'),
  ])
  return {
    products: products.map(decodeProduct).filter(Boolean).sort((a, b) => a.createdAt - b.createdAt),
    customers: customers.map(decodeCustomer).filter(Boolean).sort((a, b) => a.createdAt - b.createdAt),
    deliveries: deliveries.map(decodeDelivery).filter(Boolean).sort((a, b) => b.deliveredAt - a.deliveredAt),
    settlements: settlements.map(decodeSettlement).filter(Boolean).sort((a, b) => b.settledAt - a.settledAt),
    expenses: expenses.map(decodeExpense).filter(Boolean).sort((a, b) => b.spentAt - a.spentAt),
    marketItems: marketItems.map(decodeMarket).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name)),
    sales: sales.map(decodeSale).filter(Boolean).sort((a, b) => b.soldAt - a.soldAt),
  }
}

export async function commitWrites(uid, token, writes) {
  await request(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:commit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      writes: writes.map((write) => ({
        update: {
          name: resource(uid, write.collection, write.id),
          fields: write.fields,
        },
      })),
    }),
  })
}

export async function setDoc(uid, token, collection, id, fields) {
  await request(`https://firestore.googleapis.com/v1/${resource(uid, collection, id)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  })
}

export async function deleteDoc(uid, token, collection, id) {
  await request(`https://firestore.googleapis.com/v1/${resource(uid, collection, id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}
