"use client";
import { useEffect, useState } from "react";
export default function Profile(){ const [profile,setProfile]=useState<any>({}); useEffect(()=>{(async()=>{const r=await fetch('/api/profile'); setProfile((await r.json()).profile||{});})();},[]);
 return <div className="card"><h1>Profile</h1><pre>{JSON.stringify(profile,null,2)}</pre></div>;
}
