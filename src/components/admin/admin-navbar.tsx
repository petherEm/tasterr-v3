"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import { Shield, BarChart3, Users, FileText, Menu, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

const navigation = [
  { name: 'Panel Główny', href: '/admin', icon: BarChart3 },
  { name: 'Zarządzaj Ankietami', href: '/admin/surveys', icon: FileText },
  { name: 'Użytkownicy', href: '/admin/users', icon: Users },
]

export function AdminNavbar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="bg-black border-b border-[#94B2F9]/20 sticky top-0 z-50 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <motion.div
            className="flex items-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link href="/admin" className="flex items-center space-x-3">
              <Image
                src="/touch-logo.svg"
                alt="Touch"
                width={150}
                height={50}
                className="brightness-0 invert"
              />
              <div className="flex flex-col items-start">
                <div className="flex items-center space-x-1">
                  <Shield className="h-4 w-4 text-[#94B2F9]" />
                  <span className="text-xs font-semibold text-[#94B2F9] tracking-wider uppercase">
                    Admin
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navigation.map((item, index) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative group",
                        isActive
                          ? "text-[#94B2F9] bg-[#94B2F9]/10"
                          : "text-gray-300 hover:text-[#94B2F9] hover:bg-white/5"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#94B2F9] rounded-full"
                          initial={false}
                        />
                      )}
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Mobile menu button and User Button */}
          <div className="flex items-center space-x-4">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                  userButtonPopoverCard: "bg-black border border-[#94B2F9]/20",
                  userButtonPopoverActions: "bg-black",
                  userButtonPopoverActionButton: "text-gray-300 hover:text-[#94B2F9] hover:bg-white/5",
                  userButtonPopoverFooter: "bg-black border-t border-[#94B2F9]/20"
                }
              }}
            />

            {/* Mobile menu button */}
            <div className="md:hidden">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="text-gray-300 hover:text-[#94B2F9] p-2"
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="md:hidden border-t border-[#94B2F9]/20"
            >
              <div className="px-2 pt-2 pb-3 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium transition-colors",
                        isActive
                          ? "text-[#94B2F9] bg-[#94B2F9]/10"
                          : "text-gray-300 hover:text-[#94B2F9] hover:bg-white/5"
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  )
}