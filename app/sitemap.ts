// app/sitemap.ts
import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mon-pdf.fr'
  const locales = ['en', 'fr'] as const
  const tools = [
    'split',
    'merge',
    'organize-pdf',
    'compress-pdf',
    'image-to-pdf',
    'ocr',
    'pdf-to-images',
    'page-numbering',
    'scan-pdf',
  ]

  const routes: MetadataRoute.Sitemap = []

  // Homepage for each locale
  locales.forEach((locale) => {
    routes.push({
      url: `${baseUrl}/${locale}`,
      lastModified: new Date(),   // could be refined to actual content mod-date
      changeFrequency: 'daily',
      priority: 1.0,
      alternates: {
        languages: locales.reduce((acc, l) => {
          if (l !== locale) acc[l] = `${baseUrl}/${l}`
          return acc
        }, {} as Record<string, string>)
      }
    })
  })

  // Tool pages for each locale
  locales.forEach((locale) => {
    tools.forEach((tool) => {
      routes.push({
        url: `${baseUrl}/${locale}/${tool}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',  // tools change less often than homepage
        priority: 0.8,
        alternates: {
          languages: locales.reduce((acc, l) => {
            if (l !== locale) acc[l] = `${baseUrl}/${l}/${tool}`
            return acc
          }, {} as Record<string, string>)
        }
      })
    })
  })

  return routes
}
