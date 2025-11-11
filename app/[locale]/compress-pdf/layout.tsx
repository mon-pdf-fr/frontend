import { getTranslations } from 'next-intl/server'
import { Metadata } from 'next'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale })

  const title = `${t('tools.compressPdf.title')} - ${t('header.title')}`
  const description = t('seo.compressPdf.metaDescription')

  const keywords =
    locale === 'fr'
      ? 'compresser pdf, réduire taille pdf, optimiser pdf, compresseur pdf gratuit, réduire pdf en ligne, compression pdf, optimisation pdf, pdf plus léger, réduire fichier pdf'
      : 'compress pdf, reduce pdf size, optimize pdf, free pdf compressor, reduce pdf online, pdf compression, pdf optimization, smaller pdf, shrink pdf file'

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: `/${locale}/compress-pdf`,
      languages: {
        'en': '/en/compress-pdf',
        'fr': '/fr/compress-pdf',
      },
    },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: locale === 'fr' ? 'fr_FR' : 'en_US',
      url: `/${locale}/compress-pdf`,
      siteName: t('header.title'),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
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

export default function CompressPDFLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
