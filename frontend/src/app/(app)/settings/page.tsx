'use client'

import { Menu } from 'lucide-react'
import { SettingCard } from '@/components/settings/SettingCard'
import { ProfileForm } from '@/components/settings/ProfileForm'
import { PasswordForm } from '@/components/settings/PasswordForm'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { useMobileSidebar } from '@/components/layout/AppShell'

export default function SettingsPage() {
  const mobileSidebar = useMobileSidebar()

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 px-4 sm:px-6 h-14 border-b shrink-0">
        <button
          onClick={mobileSidebar.open}
          className="md:hidden text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-sm">Paramètres</h1>
        <div className="ml-auto">
          <NotificationBell />
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
          <SettingCard
            title="Profil"
            description="Votre nom affiché et votre avatar."
          >
            <ProfileForm />
          </SettingCard>

          <SettingCard
            title="Mot de passe"
            description="Modifiez votre mot de passe de connexion."
          >
            <PasswordForm />
          </SettingCard>
        </div>
      </div>
    </div>
  )
}
