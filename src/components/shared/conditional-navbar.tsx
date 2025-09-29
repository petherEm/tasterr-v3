"use client"

import { usePathname } from "next/navigation"
import { Navbar } from "./navbar"

export function ConditionalNavbar() {
  const pathname = usePathname()

  // Don't show the main navbar on admin routes
  if (pathname.startsWith('/admin')) {
    return null
  }

  return <Navbar />
}