import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as cloud from '../lib/cloud.js'
import { seedSnapshot } from '../lib/logic.js'
import {
  activeProducts,
  allStock,
  batchNumber,
  itemsSummary,
  revive,
  statsFor,
  stockFor,
  stockQty,
} from '../lib/logic.js'
import { newId } from '../lib/format.js'

const StoreContext = createContext(null)
const SESSION_KEY = 'cukie.session'

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeSession(session) {
  if (!session) localStorage.removeItem(SESSION_KEY)
  else localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

function cacheKey(uid) {
  return `cukie.ledger.${uid}`
}

function readCache(uid) {
  try {
    const raw = localStorage.getItem(cacheKey(uid))
    return raw ? revive(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

function writeCache(uid, snapshot) {
  localStorage.setItem(cacheKey(uid), JSON.stringify(snapshot))
}

const emptyLedger = {
  products: [],
  customers: [],
  deliveries: [],
  settlements: [],
  expenses: [],
  marketItems: [],
  sales: [],
}

export function StoreProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState(null)
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [ledger, setLedger] = useState(emptyLedger)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const sessionRef = useRef(null)
  sessionRef.current = session

  function adopt(next) {
    sessionRef.current = next
    setSession(next)
    writeSession(next)
  }

  async function validToken() {
    const current = sessionRef.current
    if (!current) throw new Error('Sign in to save the ledger.')
    if (current.expiresAt > Date.now() + 120000) return current.idToken
    const refreshed = await cloud.refresh(current)
    adopt(refreshed)
    return refreshed.idToken
  }

  async function pull(prepare) {
    const current = sessionRef.current
    if (!current) return
    const showSpinner = ledger.products.length === 0
    if (showSpinner) setLoading(true)
    setError('')
    try {
      const token = await validToken()
      if (prepare) {
        const existing = await cloud.fetchLedger(current.uid, token)
        if (existing.products.length === 0) {
          const seeded = seedSnapshot()
          const writes = [
            ...seeded.products.map((product) => ({ collection: 'products', id: product.id, fields: cloud.productFields(product) })),
            ...seeded.customers.map((customer) => ({ collection: 'customers', id: customer.id, fields: cloud.customerFields(customer) })),
            ...seeded.marketItems.map((item) => ({ collection: 'market_items', id: item.id, fields: cloud.marketFields(item) })),
          ]
          await cloud.commitWrites(current.uid, token, writes)
        } else {
          setLedger(existing)
          writeCache(current.uid, existing)
          setLoading(false)
          return
        }
      }
      const next = await cloud.fetchLedger(current.uid, token)
      setLedger(next)
      writeCache(current.uid, next)
    } catch (err) {
      const cached = readCache(current.uid)
      if (cached && ledger.products.length === 0 && cached.products?.length) {
        setLedger(cached)
        setNotice(`Showing the copy saved in this browser. ${err.message}`)
      } else if (ledger.products.length === 0) {
        setError(err.message)
      } else {
        setNotice(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancel = false
    async function boot() {
      const saved = readSession()
      if (saved) {
        try {
          const next = saved.expiresAt > Date.now() + 120000 ? saved : await cloud.refresh(saved)
          if (!cancel) adopt(next)
        } catch {
          if (!cancel) adopt(null)
        }
      }
      if (!cancel) setReady(true)
    }
    boot()
    return () => { cancel = true }
  }, [])

  useEffect(() => {
    if (!session?.uid) {
      setLedger(emptyLedger)
      return
    }
    pull(true).catch(() => {})
    // pull uses the latest session ref; uid is the only trigger we want
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.uid])

  async function runAuth(action) {
    setAuthBusy(true)
    setAuthError('')
    try {
      adopt(await action())
    } catch (err) {
      setAuthError(err.message)
    } finally {
      setAuthBusy(false)
    }
  }

  async function mutate(work) {
    try {
      await work()
      await pull(false)
      return true
    } catch (err) {
      setNotice(err.message)
      return false
    }
  }

  async function write(collection, id, fields) {
    const token = await validToken()
    await cloud.setDoc(sessionRef.current.uid, token, collection, id, fields)
  }

  async function remove(collection, id) {
    const token = await validToken()
    await cloud.deleteDoc(sessionRef.current.uid, token, collection, id)
  }

  const api = useMemo(() => {
    const snapshot = ledger
    const shops = snapshot.customers.filter((customer) => customer.kind === 'consignment')
    const directs = snapshot.customers.filter((customer) => customer.kind === 'direct')
    return {
      ready,
      session,
      authBusy,
      authError,
      loading,
      error,
      notice,
      clearNotice: () => setNotice(''),
      clearAuthError: () => setAuthError(''),
      signIn: (email, password) => runAuth(() => cloud.signIn(email, password)),
      register: (email, password) => runAuth(() => cloud.register(email, password)),
      signOut: () => {
        adopt(null)
        setLedger(emptyLedger)
        setNotice('')
        setError('')
      },
      reload: () => pull(false),
      ...snapshot,
      activeProducts: activeProducts(snapshot.products),
      shops,
      directs,
      stats: statsFor(snapshot),
      stockFor: (customer) => stockFor(snapshot, customer),
      allStock: allStock(snapshot),
      batchNumber: (delivery) => batchNumber(snapshot.deliveries, delivery),
      itemsSummary: (pairs) => itemsSummary(snapshot.products, pairs),
      saveProduct: (product) => mutate(() => write('products', product.id, cloud.productFields(product))),
      saveCustomer: (customer) => mutate(() => write('customers', customer.id, cloud.customerFields(customer))),
      saveMarketItem: (item) => mutate(() => write('market_items', item.id, cloud.marketFields(item))),
      deleteMarketItem: (id) => mutate(() => remove('market_items', id)),
      deleteExpense: (id) => mutate(() => remove('expenses', id)),
      deleteSettlement: (id) => mutate(() => remove('settlements', id)),
      deleteSale: (id) => mutate(() => remove('sales', id)),
      deleteDelivery: (delivery) => mutate(async () => {
        for (const item of delivery.items) {
          if (stockQty(snapshot, delivery.customerId, item.productId) - item.quantity < 0) {
            throw new Error('Cannot delete this batch. Some of these cookies were already settled as sold.')
          }
        }
        await remove('deliveries', delivery.id)
      }),
      addDelivery: ({ customerId, deliveredAt, quantities, notes }) => mutate(async () => {
        const id = newId()
        const items = Object.entries(quantities).flatMap(([productId, quantity]) => {
          const product = snapshot.products.find((entry) => entry.id === productId)
          if (!product || quantity <= 0) return []
          return [{
            id: newId(),
            deliveryId: id,
            productId,
            quantity,
            costPrice: product.costPrice,
            sellPrice: product.sellPrice,
          }]
        })
        if (!items.length) throw new Error('Add at least one cookie to the batch.')
        await write('deliveries', id, cloud.deliveryFields({
          id,
          customerId,
          deliveredAt,
          notes,
          createdAt: new Date(),
          items,
        }))
      }),
      addSettlement: ({ customerId, settledAt, sold, notes }) => mutate(async () => {
        const id = newId()
        const items = []
        for (const [productId, quantity] of Object.entries(sold)) {
          if (quantity <= 0) continue
          const available = stockQty(snapshot, customerId, productId)
          const product = snapshot.products.find((entry) => entry.id === productId)
          if (quantity > available) {
            throw new Error(`Sold ${quantity} ${product?.name || 'cookies'} but only ${available} are with this customer.`)
          }
          if (!product) continue
          items.push({
            id: newId(),
            settlementId: id,
            productId,
            quantitySold: quantity,
            costPrice: product.costPrice,
            sellPrice: product.sellPrice,
          })
        }
        if (!items.length) throw new Error('Enter how many cookies they sold.')
        const amountReceived = items.reduce((sum, item) => sum + item.quantitySold * item.sellPrice, 0)
        await write('settlements', id, cloud.settlementFields({
          id,
          customerId,
          settledAt,
          amountReceived,
          notes,
          createdAt: new Date(),
          items,
        }))
      }),
      addSale: ({ customerId, soldAt, quantities, notes }) => mutate(async () => {
        const id = newId()
        const items = Object.entries(quantities).flatMap(([productId, quantity]) => {
          const product = snapshot.products.find((entry) => entry.id === productId)
          if (!product || quantity <= 0) return []
          return [{
            id: newId(),
            saleId: id,
            productId,
            quantity,
            costPrice: product.costPrice,
            sellPrice: product.sellPrice,
          }]
        })
        if (!items.length) throw new Error('Add at least one cookie to the sale.')
        const amountReceived = items.reduce((sum, item) => sum + item.quantity * item.sellPrice, 0)
        await write('sales', id, cloud.saleFields({
          id,
          customerId,
          soldAt,
          amountReceived,
          notes,
          createdAt: new Date(),
          items,
        }))
      }),
      addExpense: (expense) => mutate(() => write('expenses', expense.id, cloud.expenseFields(expense))),
      addMarketExpense: ({ item, amount, spentAt, notes }) => mutate(async () => {
        const expense = {
          id: newId(),
          spentAt,
          amount,
          title: item.name,
          notes,
          createdAt: new Date(),
          marketItemId: item.id,
        }
        const updated = { ...item, usualPrice: amount, lastBoughtAt: spentAt }
        const token = await validToken()
        await cloud.commitWrites(sessionRef.current.uid, token, [
          { collection: 'expenses', id: expense.id, fields: cloud.expenseFields(expense) },
          { collection: 'market_items', id: item.id, fields: cloud.marketFields(updated) },
        ])
      }),
    }
  }, [authBusy, authError, error, ledger, loading, notice, ready, session])

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
}

export function useStore() {
  const value = useContext(StoreContext)
  if (!value) throw new Error('Store missing')
  return value
}
