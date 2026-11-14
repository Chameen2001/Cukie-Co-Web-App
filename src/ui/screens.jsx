import { useState } from 'react'
import { useStore } from '../state/store.jsx'
import { useDrawer } from './forms.jsx'
import { useRoute } from '../lib/route.js'
import { colorFromArgb, countLabel, formatQty, fromInputDate, lkr, prettyDate, toInputDate } from '../lib/format.js'
import { Confirm, PageHead } from './primitives.jsx'

export function Desk() {
  const store = useStore()
  const { open } = useDrawer()
  const stats = store.stats
  const shops = store.shops
  const directs = store.directs
  const owing = shops.filter((shop) => store.stockFor(shop).remainingCookies > 0)
  const settle = owing[0] || shops[0]

  return (
    <>
      <PageHead kicker="Desk" title="What’s in the till" lede="Money already received, cookies still sitting with shops, and the moves for today." />
      <div className="figure-row">
        <div>
          <p className="kicker">Received</p>
          <p className="figure">{lkr(stats.revenue)}</p>
        </div>
        <p className="aside">After expenses, <strong>{lkr(stats.cashProfit)}</strong> is left in cash.</p>
      </div>
      <div className="metrics">
        <article className="metric incoming"><span>Incoming</span><b>{lkr(stats.incoming)}</b><small>Unsold cookies at shops</small></article>
        <article className="metric out"><span>Expenses</span><b>{lkr(stats.expenses)}</b><small>Supermarket spend</small></article>
        <article className="metric profit"><span>Cash profit</span><b>{lkr(stats.cashProfit)}</b><small>Received minus expenses</small></article>
        <article className="metric"><span>Cookie margin</span><b>{lkr(stats.cookieMargin)}</b><small>Sold minus cookie cost</small></article>
      </div>
      <div className="workspace">
        <section>
          <div className="section-label"><h2>At a glance</h2></div>
          <dl className="facts">
            <div><dt>Batches sent to shops</dt><dd>{stats.batchesSent}</dd></div>
            <div><dt>Direct sales</dt><dd>{stats.directSales}</dd></div>
            <div><dt>Cookies sold</dt><dd>{formatQty(stats.cookiesSold)}</dd></div>
            <div><dt>Still with shops</dt><dd>{formatQty(stats.cookiesWithCustomers)}</dd></div>
            <div><dt>Cookie cost on sold</dt><dd>{lkr(stats.cookieCost)}</dd></div>
          </dl>
          <div className="section-label" style={{ marginTop: 28 }}><h2>People</h2><a href="#/people">Open</a></div>
          {store.allStock.length === 0 ? <p className="empty">Add a shop or a neighbor from the kitchen.</p> : store.allStock.map((stock) => (
            <a className="person-link" href={`#/people/${encodeURIComponent(stock.customer.id)}`} key={stock.customer.id}>
              <div className="person-top">
                <div>
                  <strong>{stock.customer.name}</strong>
                  <p className="sub">
                    <span className={stock.customer.kind === 'direct' ? 'kind direct' : 'kind shop'}>
                      {stock.customer.kind === 'direct' ? 'Direct' : 'Shop'}
                    </span>
                    {' '}
                    {stock.customer.kind === 'direct'
                      ? `${countLabel(stock.directSaleCount, 'sale')} · ${formatQty(stock.directCookies)} bought`
                      : `${countLabel(stock.batchCount, 'batch')} · ${formatQty(stock.remainingCookies)} still out`}
                  </p>
                </div>
                <span className="money">{lkr(stock.customer.kind === 'direct' ? stock.directRevenue : stock.incomingValue)}</span>
              </div>
              {stock.customer.kind === 'consignment' && stock.needsRestock ? <p className="warn">Some cookies are out. Send a restock.</p> : null}
            </a>
          ))}
        </section>
        <section>
          <div className="section-label"><h2>Do next</h2></div>
          <button type="button" className="action-row" disabled={!shops.length} onClick={() => open({ type: 'delivery', customerId: shops[0]?.id })}>
            <span>Send a batch<small>{shops.length ? 'Leave cookies with a shop' : 'Add a shop first'}</small></span>
          </button>
          <button type="button" className="action-row" disabled={!directs.length} onClick={() => open({ type: 'sale', customerId: directs.length === 1 ? directs[0].id : null })}>
            <span>Record a sale<small>{directs.length ? 'Someone paid on the spot' : 'Add a direct customer first'}</small></span>
          </button>
          <button type="button" className="action-row" disabled={!settle} onClick={() => open({ type: 'settle', customerId: settle.id })}>
            <span>Settle sold<small>{settle ? `Start with ${settle.name}` : 'No shop to settle'}</small></span>
          </button>
          <a className="action-row" href="#/market">
            <span>Market run<small>Log flour, butter, and the rest</small></span>
          </a>
        </section>
      </div>
    </>
  )
}

export function People() {
  const route = useRoute()
  const selected = route.name === 'person' ? route.id : ''
  return (
    <div className={selected ? 'split has-detail' : 'split'}>
      <section className="list">
        <PeopleList selected={selected} />
      </section>
      <section className="detail">
        {selected ? <Person id={selected} /> : <p className="placeholder">Choose someone to see what they hold, what they bought, and what they paid.</p>}
      </section>
    </div>
  )
}

function PeopleList({ selected }) {
  const store = useStore()
  const [filter, setFilter] = useState('all')
  const rows = store.allStock.filter((stock) => {
    if (filter === 'shop') return stock.customer.kind === 'consignment'
    if (filter === 'direct') return stock.customer.kind === 'direct'
    return true
  })
  return (
    <>
      <PageHead kicker="People" title="Who has cookies" lede="Shops keep stock and pay later. Neighbors pay when they take a box." />
      <div className="filters">
        {[['all', 'All'], ['shop', 'Shops'], ['direct', 'Direct']].map(([id, label]) => (
          <button type="button" key={id} className={filter === id ? 'filter on' : 'filter'} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>
      {rows.length === 0 ? <p className="empty">No one here yet. Add them from the kitchen.</p> : rows.map((stock) => {
        const customer = stock.customer
        const direct = customer.kind === 'direct'
        return (
          <a className={selected === customer.id ? 'person-link active' : 'person-link'} href={`#/people/${encodeURIComponent(customer.id)}`} key={customer.id}>
            <div className="person-top">
              <div>
                <strong>{customer.name}</strong>
                <p className="sub">
                  <span className={direct ? 'kind direct' : 'kind shop'}>{direct ? 'Direct' : 'Shop'}</span>
                  {' '}
                  {direct ? countLabel(stock.directSaleCount, 'sale') : `${countLabel(stock.batchCount, 'batch')} sent`}
                </p>
              </div>
              <span className="money">{lkr(direct ? stock.directRevenue : stock.incomingValue)}</span>
            </div>
            {direct ? (
              <p className="sub">{stock.directSaleCount === 0 ? 'No paid sales yet.' : `${formatQty(stock.directCookies)} bought · paid on the spot`}</p>
            ) : stock.lines.map((line) => (
              <div key={line.product.id}>
                <p className="sub"><span className="swatch" style={{ background: colorFromArgb(line.product.color) }} />{line.product.name} · {line.remaining} with them · {line.sold} sold</p>
                {line.delivered > 0 ? <div className="bar"><span style={{ width: `${Math.min(100, (line.sold / line.delivered) * 100)}%` }} /></div> : null}
              </div>
            ))}
          </a>
        )
      })}
    </>
  )
}

function Person({ id }) {
  const store = useStore()
  const { open } = useDrawer()
  const customer = store.customers.find((entry) => entry.id === id)
  const [pending, setPending] = useState(null)
  if (!customer) return <p className="empty">That customer is gone.</p>
  const stock = store.stockFor(customer)
  const direct = customer.kind === 'direct'
  const description = direct
    ? 'Neighbor or regular — they pay when they buy.'
    : 'Shop or cafe — they keep cookies and pay later for what sold.'

  return (
    <>
      <a className="back" href="#/people">All people</a>
      <PageHead kicker={direct ? 'Direct' : 'Shop'} title={customer.name} lede={customer.notes || description} />
      {direct ? (
        <>
          <p>{countLabel(stock.directSaleCount, 'sale')} · {formatQty(stock.directCookies)} · {lkr(stock.directRevenue)} received. Nothing is left sitting with them.</p>
          <button type="button" className="btn" onClick={() => open({ type: 'sale', customerId: customer.id })}>Record sale</button>
          <div className="section-label" style={{ marginTop: 28 }}><h2>Sales</h2></div>
          {store.sales.filter((sale) => sale.customerId === id).length === 0 ? <p className="empty">When they buy and pay, record it here.</p> : store.sales.filter((sale) => sale.customerId === id).map((sale) => (
            <article className="entry" key={sale.id}>
              <div>
                <strong>{prettyDate(sale.soldAt)} · {lkr(sale.amountReceived)}</strong>
                <p className="sub">{summary(store, sale.items.map((item) => ({ productId: item.productId, quantity: item.quantity })), sale.notes)}</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => store.deleteSale(sale.id)}>Delete</button>
            </article>
          ))}
        </>
      ) : (
        <>
          <p>{countLabel(stock.batchCount, 'batch')} · {formatQty(stock.deliveredCookies)} sent · {formatQty(stock.remainingCookies)} still with them. Incoming {lkr(stock.incomingValue)} if the rest sells.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0 20px' }}>
            <button type="button" className="btn" onClick={() => open({ type: 'delivery', customerId: customer.id })}>Restock</button>
            <button type="button" className="btn ghost" disabled={stock.remainingCookies === 0} onClick={() => open({ type: 'settle', customerId: customer.id })}>Settle</button>
          </div>
          {stock.lines.map((line) => (
            <div key={line.product.id} className="qty-row">
              <span><span className="swatch" style={{ background: colorFromArgb(line.product.color) }} />{line.product.name}</span>
              <span>{line.remaining} left · {line.sold} paid</span>
            </div>
          ))}
          <div className="section-label" style={{ marginTop: 28 }}><h2>Batches</h2></div>
          {store.deliveries.filter((delivery) => delivery.customerId === id).length === 0 ? <p className="empty">When they ask for cookies, log the batch you gave them.</p> : store.deliveries.filter((delivery) => delivery.customerId === id).map((delivery) => (
            <article className="entry" key={delivery.id}>
              <div>
                <strong>Batch {store.batchNumber(delivery)} · {prettyDate(delivery.deliveredAt)}</strong>
                <p className="sub">{summary(store, delivery.items.map((item) => ({ productId: item.productId, quantity: item.quantity })), delivery.notes)}</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setPending(delivery)}>Delete</button>
            </article>
          ))}
          <div className="section-label" style={{ marginTop: 28 }}><h2>Settlements</h2></div>
          {store.settlements.filter((settlement) => settlement.customerId === id).length === 0 ? <p className="empty">Nothing settled yet. Record the payment any day they tell you the numbers.</p> : store.settlements.filter((settlement) => settlement.customerId === id).map((settlement) => (
            <article className="entry" key={settlement.id}>
              <div>
                <strong>{prettyDate(settlement.settledAt)} · {lkr(settlement.amountReceived)}</strong>
                <p className="sub">{store.itemsSummary(settlement.items.map((item) => ({ productId: item.productId, quantity: item.quantitySold })))}</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => store.deleteSettlement(settlement.id)}>Delete</button>
            </article>
          ))}
        </>
      )}
      {pending ? (
        <Confirm
          title="Delete this batch?"
          body="This only works if those cookies have not already been settled as sold."
          onNo={() => setPending(null)}
          onYes={async () => {
            const delivery = pending
            setPending(null)
            try { await store.deleteDelivery(delivery) } catch { /* notice already set */ }
          }}
        />
      ) : null}
    </>
  )
}

function summary(store, pairs, notes) {
  return [store.itemsSummary(pairs), notes].filter(Boolean).join('\n')
}

export function Till() {
  const store = useStore()
  const { open } = useDrawer()
  const income = [
    ...store.settlements.map((settlement) => ({
      id: settlement.id,
      date: settlement.settledAt,
      title: `${store.customers.find((customer) => customer.id === settlement.customerId)?.name || 'Customer'} · ${lkr(settlement.amountReceived)}`,
      subtitle: `Shop settlement · ${prettyDate(settlement.settledAt)}\n${store.itemsSummary(settlement.items.map((item) => ({ productId: item.productId, quantity: item.quantitySold })))}`,
      remove: () => store.deleteSettlement(settlement.id),
    })),
    ...store.sales.map((sale) => ({
      id: sale.id,
      date: sale.soldAt,
      title: `${store.customers.find((customer) => customer.id === sale.customerId)?.name || 'Customer'} · ${lkr(sale.amountReceived)}`,
      subtitle: `Direct sale · ${prettyDate(sale.soldAt)}\n${store.itemsSummary(sale.items.map((item) => ({ productId: item.productId, quantity: item.quantity })))}`,
      remove: () => store.deleteSale(sale.id),
    })),
  ].sort((a, b) => b.date - a.date)

  return (
    <>
      <PageHead kicker="Till" title="Money in and out" lede="Shop settlements and neighbor sales on one side. Supermarket spend on the other.">
        <a className="btn" href="#/market">Market run</a>
      </PageHead>
      <div className="till">
        <section>
          <div className="section-label">
            <h2>Income</h2>
            {store.directs.length ? (
              <button type="button" className="text-btn" onClick={() => open({ type: 'sale', customerId: store.directs.length === 1 ? store.directs[0].id : null })}>Record sale</button>
            ) : store.shops[0] ? (
              <button type="button" className="text-btn" onClick={() => open({ type: 'settle', customerId: store.shops[0].id })}>Settle sold</button>
            ) : null}
          </div>
          {income.length === 0 ? <p className="empty">No payments yet. Settle a shop any day they report sales, or log a neighbor sale when they pay.</p> : income.map((entry) => (
            <article className="entry" key={entry.id}>
              <div>
                <strong>{entry.title}</strong>
                <p className="sub" style={{ whiteSpace: 'pre-line' }}>{entry.subtitle}</p>
              </div>
              <button type="button" className="icon-btn" onClick={entry.remove}>Delete</button>
            </article>
          ))}
        </section>
        <section>
          <div className="section-label"><h2>Expenses</h2><span className="money">{lkr(store.stats.expenses)}</span></div>
          {store.expenses.length === 0 ? <p className="empty">No spend yet. A market run remembers the last price of flour, butter, and the rest.</p> : store.expenses.map((expense) => (
            <article className="entry" key={expense.id}>
              <div>
                <strong>{expense.title}</strong>
                <p className="sub">{prettyDate(expense.spentAt)} · {lkr(expense.amount)}{expense.notes ? `\n${expense.notes}` : ''}</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => store.deleteExpense(expense.id)}>Delete</button>
            </article>
          ))}
        </section>
      </div>
    </>
  )
}

export function Kitchen() {
  const store = useStore()
  const { open } = useDrawer()
  return (
    <>
      <PageHead kicker="Kitchen" title="Recipes, people, tins" lede="The cookies you sell, who you sell them to, and the ingredients you buy." />
      <div className="kitchen">
        <section>
          <div className="section-label"><h2>Cookies</h2><button type="button" className="text-btn" onClick={() => open({ type: 'product', product: null })}>Add</button></div>
          {store.products.map((product) => (
            <button type="button" className="catalog-row" key={product.id} onClick={() => open({ type: 'product', product })}>
              <span>
                <strong><span className="swatch" style={{ background: colorFromArgb(product.color) }} />{product.archived ? `${product.name} (hidden)` : product.name}</strong>
                <p className="sub">Cost {lkr(product.costPrice)} · sells {lkr(product.sellPrice)} · margin {lkr(product.sellPrice - product.costPrice)}</p>
              </span>
            </button>
          ))}
        </section>
        <section>
          <div className="section-label"><h2>Customers</h2><button type="button" className="text-btn" onClick={() => open({ type: 'customer', customer: null })}>Add</button></div>
          {store.customers.map((customer) => (
            <button type="button" className="catalog-row" key={customer.id} onClick={() => open({ type: 'customer', customer })}>
              <span>
                <strong>{customer.name}</strong>
                <p className="sub">{[customer.kind === 'direct' ? 'Direct' : 'Shop', customer.notes].filter(Boolean).join(' · ')}</p>
              </span>
            </button>
          ))}
        </section>
        <section>
          <div className="section-label"><h2>Market list</h2><button type="button" className="text-btn" onClick={() => open({ type: 'marketItem', item: null })}>Add</button></div>
          <p className="sub">Tap these during a market run. The last price sticks.</p>
          {store.marketItems.map((item) => (
            <button type="button" className="catalog-row" key={item.id} onClick={() => open({ type: 'marketItem', item })}>
              <span>
                <strong>{item.name}</strong>
                <p className="sub">{[item.unit, item.usualPrice > 0 ? `Last paid ${lkr(item.usualPrice)}` : 'No price yet'].filter(Boolean).join(' · ')}</p>
              </span>
            </button>
          ))}
        </section>
      </div>
      <section style={{ marginTop: 36 }}>
        <div className="section-label"><h2>How a week goes</h2></div>
        <div className="week">
          <div><b>01</b> Shops pay later for what sold. Neighbors pay when they buy.</div>
          <div><b>02</b> When a shop asks, send a batch. Restock when a flavor runs out.</div>
          <div><b>03</b> Settle any day they report numbers. Leftovers stay with them.</div>
          <div><b>04</b> A neighbor sale records the cookies and the payment together.</div>
          <div><b>05</b> Log supermarket items. The price you paid is the next default.</div>
          <div><b>06</b> Incoming is what the unsold shop cookies are worth.</div>
        </div>
      </section>
    </>
  )
}

export function Market() {
  const store = useStore()
  const { open } = useDrawer()
  const [date, setDate] = useState(toInputDate())
  const [added, setAdded] = useState([])
  const spentAt = fromInputDate(date)

  return (
    <>
      <PageHead kicker="Market run" title="What you bought" lede="Stay on this list. Tap each item from the receipt, then the next, until the trip is logged.">
        <a className="text-btn" href="#/till">Back to till</a>
      </PageHead>
      <label className="field">
        <span>Shopping date</span>
        <input type="date" value={date} min="2020-01-01" max={toInputDate(new Date(Date.now() + 14 * 86400000))} onChange={(event) => setDate(event.target.value)} />
      </label>
      {added.length > 0 ? (
        <div className="trip">
          <strong>Added this trip</strong>
          <ul>{added.map((line) => <li key={line}>{line}</li>)}</ul>
        </div>
      ) : null}
      {store.marketItems.length === 0 ? (
        <p className="empty">No items yet. Add flour, butter, and the rest once in the kitchen.</p>
      ) : (
        <div className="kitchen">
          {store.marketItems.map((item) => (
            <button
              type="button"
              className="register-row"
              key={item.id}
              onClick={() => open({
                type: 'purchase',
                item,
                spentAt,
                onAdded: (line) => setAdded((current) => [...current, line]),
              })}
            >
              <span>
                <strong>{item.name}</strong>
                <p className="sub">{item.unit || 'No pack size'} · {item.usualPrice > 0 ? lkr(item.usualPrice) : 'Set the price'}</p>
              </span>
              <span className="money">Add</span>
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
        <button type="button" className="btn ghost" onClick={() => open({ type: 'other', spentAt, onAdded: (line) => setAdded((current) => [...current, line]) })}>
          Other spend
        </button>
        <button type="button" className="btn ghost" onClick={() => open({ type: 'marketItem', item: null })}>Add item</button>
      </div>
    </>
  )
}
