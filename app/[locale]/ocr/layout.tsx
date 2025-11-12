import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })

  const title = `${t('tools.ocr.title')} - ${t('header.title')}`
  const description = t('seo.ocr.metaDescription')

  return {
    title,
    description,
    keywords: locale === 'fr'
      ? 'ocr pdf, reconnaissance optique caractères, extraire texte pdf, pdf scanné en texte, ocr en ligne, détecter tableaux pdf, extraction données pdf, ocr gratuit'
      : 'pdf ocr, optical character recognition, extract text from pdf, scanned pdf to text, online ocr, detect tables pdf, pdf data extraction, free ocr',
    authors: [{ name: t('header.title') }],
    creator: t('header.title'),
    publisher: t('header.title'),
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://mon-pdf.fr'),
    alternates: {
      canonical: `/${locale}/ocr`,
      languages: {
        'en': '/en/ocr',
        'fr': '/fr/ocr',
      },
    },
    openGraph: {
      title,
      description,
      url: `/${locale}/ocr`,
      siteName: t('header.title'),
      locale: locale,
      type: 'website',
      images: [
        {
          url: '/og-image-ocr.png',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image-ocr.png'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}

export default function OCRLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
