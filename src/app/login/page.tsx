"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
export default function Login(){
  const s = createSupabaseBrowserClient(); const r = useRouter();
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [err,setErr]=useState("");
  return <div className="card" style={{maxWidth:420,margin:"40px auto"}}><h1>Sign In</h1>
    <form onSubmit={async(e)=>{e.preventDefault();const {error}=await s.auth.signInWithPassword({email,password});if(error) setErr(error.message); else r.push('/dashboard');}}>
      <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" /><br/><br/>
      <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="password" /><br/><br/>
      {err && <p>{err}</p>}<button className="button" type="submit">Sign In</button>
    </form></div>;
}
