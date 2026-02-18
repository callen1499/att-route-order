import Link from "next/link";
export default function Dashboard(){
  return <div className="card"><h1>Route Order Dashboard</h1><p>Delivery day is fixed by your route.</p>
  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Link href="/products">New Order</Link><Link href="/cart">Continue Draft</Link><Link href="/orders">Reorder</Link></div></div>
}
