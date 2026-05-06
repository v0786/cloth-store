import Link from "next/link";
import { requireRole } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("VIEWER");
  if (!session) redirect("/account/login");

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="text-sm font-semibold">Admin</div>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin" className="hover:underline">
              Dashboard
            </Link>
            <Link href="/admin/import" className="hover:underline">
              Excel Import
            </Link>
            <Link href="/admin/products" className="hover:underline">
              Products
            </Link>
          </nav>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}

