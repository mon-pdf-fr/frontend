import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })

  const title = `${t('tools.pdfToImages.title')} - ${t('header.title')}`
  const description = t('seo.pdfToImages.metaDescription')

  return {
    title,
    description,
    keywords: locale === 'fr'
      ? 'pdf en images, convertir pdf en image, pdf vers png, pdf vers jpeg, pdf vers jpg, extraire images pdf, pdf en ligne, convertisseur pdf gratuit'
      : 'pdf to images, convert pdf to image, pdf to png, pdf to jpeg, pdf to jpg, extract images from pdf, online pdf, free pdf converter',
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
      canonical: `/${locale}/pdf-to-images`,
      languages: {
        'en': '/en/pdf-to-images',
        'fr': '/fr/pdf-to-images',
      },
    },
    openGraph: {
      title,
      description,
      url: `/${locale}/pdf-to-images`,
      siteName: t('header.title'),
      locale: locale,
      type: 'website',
      images: [
        {
          url: '/og-image-pdf-to-images.png',
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
      images: ['/og-image-pdf-to-images.png'],
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

export default function PDFToImagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
