"use client"

import {
  Combine,
  FileImage,
  FileText,
  FileType,
  Hash,
  ImageIcon,
  Package,
  Scan,
  Scissors,
  SendToBack
} from "lucide-react"
import {useTranslations} from 'next-intl'
import {usePathname} from 'next/navigation'
import {PDFToolCard} from "@/components/pdf-tool-card"
import {LanguageSwitcher} from "@/components/language-switcher"
import {BookmarkButton} from "@/components/bookmark-button"
import {SiteFooter} from "@/components/site-footer"
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const t = useTranslations()
  const pathname = usePathname()
  const locale = pathname.split('/')[1] || 'en'

  const tools = [
    {
      id: "split",
      path: "split-pdf",
      icon: Scissors,
      title: t('tools.split.title'),
      description: t('tools.split.description'),
      isBeta: false,
    },
    {
      id: "merge",
      path: "merge-pdf",
      icon: Combine,
      title: t('tools.merge.title'),
      description: t('tools.merge.description'),
      isBeta: false,
    },
    {
      id: "organize-pdf",
      path: "organize-pdf",
      icon: SendToBack,
      title: t('tools.organizePdf.title'),
      description: t('tools.organizePdf.description'),
      isBeta: false,
    },
    {
      id: "compress-pdf",
      path: "compress-pdf",
      icon: Package,
      title: t('tools.compressPdf.title'),
      description: t('tools.compressPdf.description'),
      isBeta: false,
    },
    {
      id: "image-to-pdf",
      path: "image-to-pdf",
      icon: FileImage,
      title: t('tools.imageToPdf.title'),
      description: t('tools.imageToPdf.description'),
      isBeta: false,
    },
    {
      id: "pdf-to-images",
      path: "pdf-to-images",
      icon: ImageIcon,
      title: t('tools.pdfToImages.title'),
      description: t('tools.pdfToImages.description'),
      isBeta: false,
    },
    {
      id: "page-numbering",
      path: "page-numbering",
      icon: Hash,
      title: t('tools.pageNumbering.title'),
      description: t('tools.pageNumbering.description'),
      isBeta: false,
    },
    {
      id: "scan-pdf",
      path: "scan-pdf",
      icon: Scan,
      title: t('tools.scanPdf.title'),
      description: t('tools.scanPdf.description'),
      isBeta: false,
    },
    {
      id: "pdf-to-word",
      path: "pdf-to-word",
      icon: FileType,
      title: t('tools.pdfToWord.title'),
      description: t('tools.pdfToWord.description'),
      isBeta: false,
    },
    {
      id: "ocr",
      path: "ocr",
      icon: FileText,
      title: t('tools.ocr.title'),
      description: t('tools.ocr.description'),
      isBeta: true,
    },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
                  className="h-30 w-30"
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

      <main className="container mx-auto px-4 py-12 grow-1">
        <div>
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-2 text-balance">{t('home.title')}</h2>
            <p className="text-muted-foreground text-balance">
              {t('home.subtitle')}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {tools.map((tool) => (
              <PDFToolCard
                key={tool.id}
                icon={tool.icon}
                title={tool.title}
                description={tool.description}
                href={`${pathname}/${tool.path}`}
                active={false}
                isBeta={tool.isBeta}
              />
            ))}
          </div>
        </div>
      </main>

      <SiteFooter locale={pathname.split('/')[1] || 'en'} />
    </div>
  )
}
