"use client"

import { useTranslations } from 'next-intl'
import { PDFOCRTool } from "@/components/ocr/pdf-ocr-tool"
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import { LanguageSwitcher } from "@/components/language-switcher"
import { BookmarkButton } from "@/components/bookmark-button"

export default function OCRPage() {
  const t = useTranslations()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-30 w-30" />
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

        <div className="max-w-6xl mx-auto">
          <PDFOCRTool />
        </div>

        {/* SEO Content */}
        <div className="max-w-4xl mx-auto mt-16 prose prose-slate dark:prose-invert">
          <h2>{t('tools.ocr.title')} - {t('seo.ocr.heading')}</h2>
          <p>{t('seo.ocr.description1')}</p>

          <h3>{t('seo.ocr.howToTitle')}</h3>
          <ol>
            <li>{t('seo.ocr.step1')}</li>
            <li>{t('seo.ocr.step2')}</li>
            <li>{t('seo.ocr.step3')}</li>
            <li>{t('seo.ocr.step4')}</li>
          </ol>

          <h3>{t('seo.ocr.featuresTitle')}</h3>
          <ul>
            <li>{t('seo.ocr.feature1')}</li>
            <li>{t('seo.ocr.feature2')}</li>
            <li>{t('seo.ocr.feature3')}</li>
            <li>{t('seo.ocr.feature4')}</li>
            <li>{t('seo.ocr.feature5')}</li>
          </ul>

          <h3>{t('seo.ocr.whyTitle')}</h3>
          <p>{t('seo.ocr.whyDescription')}</p>
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
