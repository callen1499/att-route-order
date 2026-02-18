import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "Above the Treads", description: "Route Order App" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body><div className="container"><nav style={{display:"flex",gap:12,padding:"12px 0"}}>
      <Link href="/dashboard">Dashboard</Link><Link href="/products">Products</Link><Link href="/bulk-entry">Bulk Entry</Link><Link href="/cart">Cart</Link><Link href="/orders">History</Link><Link href="/profile">Profile</Link>
    </nav>{children}</div></body></html>
  );
}
