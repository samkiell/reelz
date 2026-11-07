"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Film, PlusCircle, Library, Settings, LogOut, ShieldCheck } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") return null;

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      // Ignore
    }
  }

  const navItems = [
    { href: "/", label: "Studio", icon: Film },
    { href: "/create", label: "Create Short", icon: PlusCircle },
    { href: "/library", label: "Library", icon: Library },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <header className="border-b border-[#232D42] bg-[#0E1420] px-6 py-3.5 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-lg tracking-wider shadow-sm">
              R
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">REELZ</span>
            <span className="text-[11px] font-semibold text-blue-400 bg-blue-950/80 border border-blue-800/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Local
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#1E293B] text-white"
                      : "text-[#94A3B8] hover:text-white hover:bg-[#151D2C]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>0-Key Safe</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-red-400 transition-colors px-2 py-1"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

