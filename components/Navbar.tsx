"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const check = () => setIsLoggedIn(!!localStorage.getItem("authToken"));
    // Initial check
    check();
    // Listen for custom auth change events (same-tab updates)
    const onAuthChange = () => check();
    window.addEventListener('auth-change', onAuthChange);
    // Listen for storage events (cross-tab updates)
    const onStorage = (e: StorageEvent) => {
      if (!e || e.key === null || e.key === 'authToken') check();
    };
    window.addEventListener('storage', onStorage);
    // Also refresh on tab focus to keep state consistent
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('auth-change', onAuthChange);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (!menuOpen) return;
      const target = e.target as Node;
      const clickedMenu = menuRef.current?.contains(target);
      const clickedToggle = toggleRef.current?.contains(target);
      if (!clickedMenu && !clickedToggle) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setIsLoggedIn(false);
    try { window.dispatchEvent(new Event('auth-change')); } catch {}
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/10 border-b border-white/20">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
              <img src="/true-otp.svg" alt="TruOTP" className="h-9 w-9" loading="lazy" decoding="async" />
            </div>
            <Link href="/" className="text-xl font-bold tracking-tight text-white group-hover:text-blue-300 transition-colors">
              TruOTP
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Link href="/" className="text-white/80 hover:text-white hover:bg-white/10 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300">
              Home
            </Link>
            <Link href="/about" className="text-white/80 hover:text-white hover:bg-white/10 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300">
              About
            </Link>
            <Link href="/contact" className="text-white/80 hover:text-white hover:bg-white/10 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300">
              Contact
            </Link>
            {isLoggedIn && (
              <Link href="/after-login-page" className="text-white/90 hover:text-white hover:bg-white/10 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300">
                Dashboard
              </Link>
            )}
            {!isLoggedIn ? (
              <div className="flex items-center gap-3 ml-4">
                <Link href="/login" className="text-white/80 hover:text-white hover:bg-white/10 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300">
                  Login
                </Link>
                <Link href="/register" className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-2 text-sm font-medium text-white shadow-lg hover:from-blue-700 hover:to-purple-700 hover:shadow-blue-500/25 transition-all duration-300">
                  Sign Up
                </Link>
              </div>
            ) : (
              <button onClick={handleLogout} className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-2 text-sm font-medium text-white shadow-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-300">
                Logout
              </button>
            )}
          </div>

          <button
            ref={toggleRef}
            className="md:hidden inline-flex items-center justify-center rounded-xl p-2 text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span className="sr-only">Open main menu</span>
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {menuOpen ? (
                <path d="M18 6 6 18M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div ref={menuRef} className="md:hidden border-t border-white/20 bg-white/10 backdrop-blur-sm rounded-b-2xl">
          <div className="mx-auto max-w-7xl px-4 py-4 space-y-2">
            <Link href="/" onClick={() => setMenuOpen(false)} className="block py-3 px-4 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300">
              Home
            </Link>
            <Link href="/about" onClick={() => setMenuOpen(false)} className="block py-3 px-4 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300">
              About
            </Link>
            <Link href="/contact" onClick={() => setMenuOpen(false)} className="block py-3 px-4 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300">
              Contact
            </Link>
            {isLoggedIn && (
              <Link href="/after-login-page" onClick={() => setMenuOpen(false)} className="block py-3 px-4 text-white/90 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300">
                Dashboard
              </Link>
            )}
            {!isLoggedIn ? (
              <div className="pt-2 flex items-center gap-3">
                <Link href="/login" onClick={() => setMenuOpen(false)} className="text-white/80 hover:text-white hover:bg-white/10 px-4 py-2 rounded-xl transition-all duration-300">
                  Login
                </Link>
                <Link href="/register" onClick={() => setMenuOpen(false)} className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-2 text-sm font-medium text-white shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300">
                  Sign Up
                </Link>
              </div>
            ) : (
              <button onClick={() => { setMenuOpen(false); handleLogout(); }} className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-2 text-sm font-medium text-white shadow-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-300">
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}