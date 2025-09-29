"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative bg-black border-b border-white/10 sticky top-0 z-50 backdrop-blur-md"
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <motion.div
            className="flex items-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link href="/" className="flex items-center space-x-3">
              <Image
                src="/touch-logo.svg"
                alt="Touch"
                width={150}
                height={50}
                className="brightness-0 invert drop-shadow-lg"
              />
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {[
                { href: "/about", label: "O nas" },
                { href: "/funky-data", label: "Ciekawe dane" },
              ].map((item, index) => {
                const isActive = pathname === item.href;
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link
                      href={item.href}
                      className={`transition-all duration-300 px-4 py-2 rounded-lg text-sm font-medium relative group backdrop-blur-sm ${
                        isActive
                          ? "text-white bg-gradient-to-r from-blue-500/20 to-indigo-500/20 shadow-lg"
                          : "text-white/80 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {item.label}
                      <motion.div
                        className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-400 to-indigo-400 transition-all duration-300 ${
                          isActive ? "w-full" : "w-0 group-hover:w-full"
                        }`}
                      />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center space-x-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="secondary"
                size="sm"
                asChild
                className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 font-semibold shadow-lg backdrop-blur-sm border-0"
              >
                <Link href="/starter">👤 Mój profil</Link>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox:
                      "w-8 h-8 ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900 shadow-lg",
                  },
                }}
              />
            </motion.div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <motion.button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white hover:text-blue-300 p-2 rounded-lg hover:bg-white/10 transition-colors"
              whileTap={{ scale: 0.9 }}
            >
              <AnimatePresence mode="wait">
                {isOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="h-6 w-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="h-6 w-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="md:hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-white/10 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-sm">
                {[
                  { href: "/about", label: "O nas" },
                  { href: "/funky-data", label: "Ciekawe dane" },
                ].map((item, index) => {
                  const isActive = pathname === item.href;
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link
                        href={item.href}
                        className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                          isActive
                            ? "text-white bg-gradient-to-r from-blue-500/20 to-indigo-500/20"
                            : "text-white/80 hover:text-white hover:bg-white/10"
                        }`}
                        onClick={() => setIsOpen(false)}
                      >
                        {item.label}
                      </Link>
                    </motion.div>
                  );
                })}
                <motion.div
                  className="pt-4 pb-3 border-t border-white/10"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="flex items-center px-3 space-x-3">
                    <UserButton
                      appearance={{
                        elements: {
                          avatarBox:
                            "w-8 h-8 ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900",
                        },
                      }}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      asChild
                      className="ml-auto bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 font-semibold border-0"
                    >
                      <Link href="/starter">👤 Mój profil</Link>
                    </Button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
