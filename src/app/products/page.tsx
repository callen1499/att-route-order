"use client";
import { useEffect, useState } from "react";
type P={id:string;name:string;sku:string;priceCents:number;favorite:boolean};
export default function Products(){ const [q,setQ]=useState(""); const [items,setItems]=useState<P[]>([]);
  async function load(){ const r=await fetch('/api/products?search='+encodeURIComponent(q)); const d=await r.json(); setItems(d.items||[]); }
  useEffect(()=>{load();},[]);
  return <div className="card"><h1>Products</h1><div style={{display:"flex",gap:8}}><input className="input" value={q} onChange={e=>setQ(e.target.value)} /><button className="button" onClick={load}>Search</button></div>
  <div style={{marginTop:12}}>{items.map(p=><div key={p.id} style={{border:'1px solid #ddd',borderRadius:8,padding:10,marginBottom:8}}>{p.name} ({p.sku}) ${(p.priceCents/100).toFixed(2)}</div>)}</div></div>;
}
