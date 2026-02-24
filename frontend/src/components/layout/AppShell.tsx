'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { AppSidebar, SidebarContent } from '@/components/layout/AppSidebar'

interface MobileSidebarCtx {
  open: () => void
}

const MobileSidebarContext = createContext<MobileSidebarCtx>({ open: () => {} })

export function useMobileSidebar() {
  return useContext(MobileSidebarContext)
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Close drawer on navigation
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  return (
    <MobileSidebarContext.Provider value={{ open: () => setIsOpen(true) }}>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop sidebar */}
        <AppSidebar />

        {/* Mobile sidebar drawer */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="left" className="p-0 w-56 flex flex-col [&>button]:hidden">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent />
          </SheetContent>
        </Sheet>

        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <main className="flex-1 overflow-auto min-h-0">
            {children}
          </main>
        </div>
      </div>
    </MobileSidebarContext.Provider>
  )
}
