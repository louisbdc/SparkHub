'use client'

import { SettingCard } from '@/components/settings/SettingCard'
import { ProfileForm } from '@/components/settings/ProfileForm'
import { PasswordForm } from '@/components/settings/PasswordForm'

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center px-6 h-14 border-b shrink-0">
        <h1 className="font-semibold text-sm">Paramètres</h1>
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
