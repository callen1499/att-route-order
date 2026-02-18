"use client";
import { useEffect, useState } from "react";
export default function Cart(){ const [draft,setDraft]=useState<any>({items:[]});
  useEffect(()=>{(async()=>{const r=await fetch('/api/draft-cart'); setDraft(await r.json());})();},[]);
  return <div className="card"><h1>Cart</h1><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(draft,null,2)}</pre></div>
}
