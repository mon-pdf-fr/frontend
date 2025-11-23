"use client"

import {usePathname} from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {LanguageSwitcher} from "@/components/language-switcher"
import {BookmarkButton} from "@/components/bookmark-button"

export function SiteHeader() {
  const pathname = usePathname()
  const locale = pathname.split('/')[1] || 'en'

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}`}>
            <Image
              src="/logo.png"
              alt={locale === 'fr'
                ? 'Mon PDF - Outils PDF Gratuits en Ligne'
                : 'Mon PDF - Free Online PDF Tools'
              }
              priority
              width={120}
              height={120}
            />
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <BookmarkButton />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  )
}
