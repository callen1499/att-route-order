"use client";
import { useEffect, useState } from "react";
export default function Orders(){ const [rows,setRows]=useState<any[]>([]); useEffect(()=>{(async()=>{const r=await fetch('/api/orders'); const d=await r.json(); setRows(d.items||[]);})();},[]);
  return <div className="card"><h1>Order History</h1><pre>{JSON.stringify(rows,null,2)}</pre></div>;
}
