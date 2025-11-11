"use client"

import { useTranslations } from 'next-intl'
import { PDFCompressTool } from "@/components/pdf-compress-tool"
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import { LanguageSwitcher } from "@/components/language-switcher"
import { BookmarkButton } from "@/components/bookmark-button"

export default function CompressPDFPage() {
  const t = useTranslations()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-10 w-10" />
          </div>
          <div className="flex items-center gap-3">
            <BookmarkButton />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 flex-1">
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="mb-6"
        >
          ← {t('common.backToTools')}
        </Button>

        <div className="max-w-3xl mx-auto">
          <PDFCompressTool />
        </div>

        {/* SEO Content */}
        <div className="max-w-4xl mx-auto mt-16 prose prose-slate dark:prose-invert">
          <h2>{t('tools.compressPdf.title')} - {t('seo.compressPdf.heading')}</h2>
          <p>{t('seo.compressPdf.description1')}</p>

          <h3>{t('seo.compressPdf.howToTitle')}</h3>
          <ol>
            <li>{t('seo.compressPdf.step1')}</li>
            <li>{t('seo.compressPdf.step2')}</li>
            <li>{t('seo.compressPdf.step3')}</li>
          </ol>

          <h3>{t('seo.compressPdf.featuresTitle')}</h3>
          <ul>
            <li>{t('seo.compressPdf.feature1')}</li>
            <li>{t('seo.compressPdf.feature2')}</li>
            <li>{t('seo.compressPdf.feature3')}</li>
            <li>{t('seo.compressPdf.feature4')}</li>
          </ul>

          <h3>{t('seo.compressPdf.whyTitle')}</h3>
          <p>{t('seo.compressPdf.whyDescription')}</p>
        </div>
      </main>

      <footer className="border-t border-border mt-24 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>{t('common.privacyNote')}</p>
        </div>
      </footer>
    </div>
  )
}
