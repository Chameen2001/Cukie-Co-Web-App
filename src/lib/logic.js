export function deliveredQty(deliveries, customerId, productId) {
  let total = 0
  for (const delivery of deliveries) {
    if (delivery.customerId !== customerId) continue
    for (const item of delivery.items) {
      if (item.productId === productId) total += item.quantity
    }
  }
  return total
}

export function soldQty(settlements, customerId, productId) {
  let total = 0
  for (const settlement of settlements) {
    if (settlement.customerId !== customerId) continue
    for (const item of settlement.items) {
      if (item.productId === productId) total += item.quantitySold
    }
  }
  return total
}

export function stockQty(snapshot, customerId, productId) {
  return deliveredQty(snapshot.deliveries, customerId, productId)
    - soldQty(snapshot.settlements, customerId, productId)
}

export function stockFor(snapshot, customer) {
  const catalog = snapshot.products.filter((product) => {
    if (!product.archived) return true
    return deliveredQty(snapshot.deliveries, customer.id, product.id) > 0
  })
  const direct = snapshot.sales.filter((sale) => sale.customerId === customer.id)
  const lines = catalog.map((product) => {
    const delivered = deliveredQty(snapshot.deliveries, customer.id, product.id)
    const sold = soldQty(snapshot.settlements, customer.id, product.id)
    const remaining = Math.max(0, delivered - sold)
    return {
      product,
      delivered,
      sold,
      remaining,
      incomingValue: remaining * product.sellPrice,
    }
  })
  const stock = {
    customer,
    lines,
    batchCount: snapshot.deliveries.filter((delivery) => delivery.customerId === customer.id).length,
    directSaleCount: direct.length,
    directRevenue: direct.reduce((sum, sale) => sum + sale.amountReceived, 0),
    directCookies: direct.reduce((sum, sale) => sum + (sale.totalQuantity ?? sale.items.reduce((count, item) => count + item.quantity, 0)), 0),
  }
  stock.remainingCookies = lines.reduce((sum, line) => sum + line.remaining, 0)
  stock.deliveredCookies = lines.reduce((sum, line) => sum + line.delivered, 0)
  stock.incomingValue = lines.reduce((sum, line) => sum + line.incomingValue, 0)
  stock.needsRestock = customer.kind === 'consignment' && lines.some((line) => (
    !line.product.archived && line.delivered > 0 && line.remaining === 0
  ))
  return stock
}

export function allStock(snapshot) {
  return snapshot.customers.map((customer) => stockFor(snapshot, customer))
}

export function statsFor(snapshot) {
  let revenue = 0
  let cookieCost = 0
  let cookiesSold = 0
  for (const settlement of snapshot.settlements) {
    revenue += settlement.amountReceived
    for (const item of settlement.items) {
      cookieCost += item.quantitySold * item.costPrice
      cookiesSold += item.quantitySold
    }
  }
  for (const sale of snapshot.sales) {
    revenue += sale.amountReceived
    for (const item of sale.items) {
      cookieCost += item.quantity * item.costPrice
      cookiesSold += item.quantity
    }
  }
  const expenses = snapshot.expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const shops = allStock(snapshot).filter((stock) => stock.customer.kind === 'consignment')
  return {
    revenue,
    expenses,
    incoming: shops.reduce((sum, stock) => sum + stock.incomingValue, 0),
    cookieCost,
    cookiesSold,
    cookiesWithCustomers: shops.reduce((sum, stock) => sum + stock.remainingCookies, 0),
    batchesSent: snapshot.deliveries.length,
    directSales: snapshot.sales.length,
    cashProfit: revenue - expenses,
    cookieMargin: revenue - cookieCost,
  }
}

export function batchNumber(deliveries, delivery) {
  const ordered = deliveries
    .filter((item) => item.customerId === delivery.customerId)
    .slice()
    .sort((a, b) => a.deliveredAt - b.deliveredAt)
  return ordered.findIndex((item) => item.id === delivery.id) + 1
}

export function itemsSummary(products, pairs) {
  return pairs
    .filter((pair) => pair.quantity > 0)
    .map((pair) => {
      const name = products.find((product) => product.id === pair.productId)?.name || 'cookies'
      return `${pair.quantity} ${name}`
    })
    .join(' · ')
}

export function activeProducts(products) {
  return products.filter((product) => !product.archived)
}

const DATE_KEYS = new Set([
  'createdAt',
  'deliveredAt',
  'settledAt',
  'soldAt',
  'spentAt',
  'lastBoughtAt',
])

export function revive(value) {
  if (Array.isArray(value)) return value.map(revive)
  if (value && typeof value === 'object') {
    const next = {}
    for (const [key, entry] of Object.entries(value)) {
      if (DATE_KEYS.has(key) && typeof entry === 'string') next[key] = new Date(entry)
      else next[key] = revive(entry)
    }
    return next
  }
  return value
}

export function seedSnapshot(now = new Date()) {
  return {
    products: [
      { id: 'product-chocolate-chip', name: 'Chocolate Chip', costPrice: 80, sellPrice: 200, color: 0xff6b3e26, createdAt: now, archived: false },
      { id: 'product-red-velvet', name: 'Red Velvet', costPrice: 90, sellPrice: 220, color: 0xff8e2f45, createdAt: now, archived: false },
    ],
    customers: [
      {
        id: 'customer-cafe-912',
        name: 'Cafe 912',
        notes: 'Shop customer. Pays for cookies they sold. Restock when they run out.',
        createdAt: now,
        kind: 'consignment',
      },
    ],
    marketItems: [
      ['market-flour', 'Flour', '1 kg'],
      ['market-butter', 'Butter', ''],
      ['market-white-sugar', 'White sugar', ''],
      ['market-brown-sugar', 'Brown sugar', ''],
      ['market-eggs', 'Eggs', 'tray'],
      ['market-choco-chips', 'Chocolate chips', ''],
      ['market-cocoa', 'Cocoa powder', ''],
      ['market-cream-cheese', 'Cream cheese', ''],
      ['market-red-color', 'Red food coloring', ''],
      ['market-vanilla', 'Vanilla essence', ''],
      ['market-baking-powder', 'Baking powder', ''],
      ['market-milk', 'Milk', ''],
      ['market-boxes', 'Cookie boxes', ''],
    ].map(([id, name, unit]) => ({
      id,
      name,
      usualPrice: 0,
      unit,
      createdAt: now,
      lastBoughtAt: null,
    })),
  }
}
