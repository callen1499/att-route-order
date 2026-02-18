"use client";
import { useState } from "react";
export default function BulkEntry(){ const [text,setText]=useState(""); const [res,setRes]=useState<any>(null);
  return <div className="card"><h1>Bulk Entry</h1><textarea className="textarea" rows={10} value={text} onChange={e=>setText(e.target.value)} />
  <br/><br/><button className="button" onClick={async()=>{const r=await fetch('/api/draft-cart/bulk-parse',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rawText:text})}); setRes(await r.json());}}>Parse</button>
  {res && <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(res,null,2)}</pre>}</div>;
}
