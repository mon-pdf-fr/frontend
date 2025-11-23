"use client"

import {useTranslations} from 'next-intl'
import {PDFScannerToolClient} from "@/components/pdf-scanner-tool-client"
import {Button} from "@/components/ui/button"
import {usePathname, useRouter} from 'next/navigation'
import {LanguageSwitcher} from "@/components/language-switcher"
import {BookmarkButton} from "@/components/bookmark-button"
import Link from 'next/link'
import Image from 'next/image'
import Script from 'next/script'
import {SiteFooter} from "@/components/site-footer";

export default function ScanPDFPage() {
  const t = useTranslations()
  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname.split('/')[1] || 'en'

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Mon PDF",
    "url": "https://mon-pdf.fr",
    "logo": "https://mon-pdf.fr/logo.png"
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [{
      "@type": "ListItem",
      "position": 1,
      "name": locale === 'fr' ? "Accueil" : "Home",
      "item": `https://mon-pdf.fr/${locale}`
    },{
      "@type": "ListItem",
      "position": 2,
      "name": locale === 'fr' ? "Scanner PDF" : "Scan PDF",
      "item": `https://mon-pdf.fr/${locale}/${locale === 'fr' ? 'scan-pdf' : 'scan-pdf'}`
    }]
  }

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": locale === 'fr' ? "Comment scanner un document en PDF" : "How to Scan a Document to PDF",
    "step": [
      {
        "@type": "HowToStep",
        "name": locale === 'fr' ? "Activer la caméra" : "Enable camera",
        "text": locale === 'fr' ? "Autorisez l'accès à votre webcam ou caméra mobile" : "Allow access to your webcam or mobile camera"
      },
      {
        "@type": "HowToStep",
        "name": locale === 'fr' ? "Scanner le document" : "Scan document",
        "text": locale === 'fr' ? "Capturez des photos de votre document" : "Capture photos of your document"
      },
      {
        "@type": "HowToStep",
        "name": locale === 'fr' ? "Télécharger le PDF" : "Download PDF",
        "text": locale === 'fr' ? "Téléchargez le PDF généré" : "Download the generated PDF"
      }
    ]
  }

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": locale === 'fr' ? "Scanner PDF en Ligne" : "Scan PDF Online",
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": locale === 'fr' ? [
      {
        "@type": "Question",
        "name": "Comment scanner un document en PDF ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Autorisez l'accès à votre caméra, capturez des photos de votre document, et notre outil les convertira automatiquement en un PDF de qualité que vous pourrez télécharger."
        }
      },
      {
        "@type": "Question",
        "name": "Puis-je scanner avec mon téléphone ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Oui, notre scanner fonctionne parfaitement sur mobile. Utilisez la caméra de votre téléphone pour scanner des documents et créer des PDF directement depuis votre navigateur."
        }
      },
      {
        "@type": "Question",
        "name": "Le scanner est-il sécurisé ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Oui, tout le traitement est effectué localement dans votre navigateur. Vos documents scannés ne sont jamais envoyés à un serveur, garantissant une confidentialité totale."
        }
      }
    ] : [
      {
        "@type": "Question",
        "name": "How to scan a document to PDF?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Allow camera access, capture photos of your document, and our tool will automatically convert them into a quality PDF you can download."
        }
      },
      {
        "@type": "Question",
        "name": "Can I scan with my phone?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, our scanner works perfectly on mobile. Use your phone's camera to scan documents and create PDFs directly from your browser."
        }
      },
      {
        "@type": "Question",
        "name": "Is the scanner secure?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, all processing is done locally in your browser. Your scanned documents are never sent to a server, ensuring complete privacy."
        }
      }
    ]
  }

  return (
    <>
      <Script id="organization-schema" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(organizationSchema)}
      </Script>
      <Script id="breadcrumb-schema" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(breadcrumbSchema)}
      </Script>
      <Script id="howto-schema" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(howToSchema)}
      </Script>
      <Script id="software-schema" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(softwareSchema)}
      </Script>
      <Script id="faq-schema" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(faqSchema)}
      </Script>

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

        <main className="container mx-auto px-4 py-12 flex-1">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
              <li>
                <Link href={`/${locale}`} className="hover:text-foreground">
                  {locale === 'fr' ? 'Accueil' : 'Home'}
                </Link>
              </li>
              <li>/</li>
              <li className="text-foreground font-medium">
                {locale === 'fr' ? 'Scanner PDF' : 'Scan PDF'}
              </li>
            </ol>
          </nav>

          <Button
            variant="ghost"
            onClick={() => router.push(`/${locale}`)}
            className="mb-6"
          >
            ← {t('common.backToTools')}
          </Button>

          <div className="max-w-3xl mx-auto mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-center mb-3">
              {locale === 'fr'
                ? 'Scanner PDF en Ligne - Numériser Document vers PDF Gratuit'
                : 'Scan PDF Online - Digitize Document to PDF Free'}
            </h1>
            <p className="text-center text-muted-foreground mb-8">
              {locale === 'fr'
                ? 'Utilisez votre caméra pour scanner des documents en PDF. Rapide, gratuit et sécurisé.'
                : 'Use your camera to scan documents to PDF. Fast, free and secure.'}
            </p>
          </div>

          <div className="max-w-7xl mx-auto">
            <PDFScannerToolClient />
          </div>

        <div className="max-w-4xl mx-auto mt-16 prose prose-slate dark:prose-invert">
          {locale === 'fr' ? (
            <>
              <h2>Scanner PDF en Ligne - Outil Gratuit</h2>
              <p>
                Notre scanner PDF en ligne vous permet de numériser des documents physiques directement depuis votre navigateur.
                Utilisez votre webcam d'ordinateur ou la caméra de votre téléphone mobile pour créer des PDF de qualité professionnelle.
                Pas besoin de scanner physique - votre appareil photo suffit ! Notre outil traite tout localement pour une confidentialité totale.
              </p>

              <h3>Comment Scanner un Document en PDF</h3>
              <ol>
                <li><strong>Activer la caméra</strong> - Autorisez l'accès à votre webcam ou caméra mobile</li>
                <li><strong>Capturer le document</strong> - Prenez des photos claires de chaque page</li>
                <li><strong>Télécharger le PDF</strong> - Obtenez votre document numérisé en PDF</li>
              </ol>

              <h3>Fonctionnalités du Scanner</h3>
              <ul>
                <li><strong>Scanner Mobile</strong> - Utilisez votre téléphone comme scanner portable</li>
                <li><strong>Scanner Webcam</strong> - Numérisez avec la caméra de votre ordinateur</li>
                <li><strong>Multi-Pages</strong> - Scannez plusieurs pages en un seul PDF</li>
                <li><strong>Détection Automatique</strong> - Détection des bords et correction de perspective</li>
                <li><strong>Amélioration d'Image</strong> - Optimisation automatique de la qualité</li>
                <li><strong>Rotation Automatique</strong> - Correction de l'orientation des pages</li>
              </ul>

              <h3>Cas d'Utilisation</h3>
              <ul>
                <li><strong>Documents Professionnels</strong> - Numérisez contrats, factures, rapports</li>
                <li><strong>Documents Administratifs</strong> - Scannez formulaires, attestations, certificats</li>
                <li><strong>Notes et Cours</strong> - Numérisez notes manuscrites et supports de cours</li>
                <li><strong>Reçus et Factures</strong> - Gardez une copie numérique de vos reçus</li>
                <li><strong>Livres et Articles</strong> - Numérisez pages de livres et articles de presse</li>
                <li><strong>Tableaux Blancs</strong> - Capturez le contenu de tableaux blancs</li>
              </ul>

              <h3>Avantages de Notre Scanner PDF</h3>
              <ul>
                <li><strong>Sans Application</strong> - Fonctionne directement dans le navigateur, aucune installation</li>
                <li><strong>Multi-Plateforme</strong> - Compatible PC, Mac, iOS, Android</li>
                <li><strong>Qualité Professionnelle</strong> - Images nettes et lisibles</li>
                <li><strong>100% Gratuit</strong> - Aucune limite de scans, aucune inscription</li>
                <li><strong>Confidentialité Totale</strong> - Traitement local, vos documents restent privés</li>
                <li><strong>Facilité d'Usage</strong> - Interface intuitive et simple</li>
              </ul>

              <h3>Conseils pour un Scan de Qualité</h3>
              <ul>
                <li><strong>Bon Éclairage</strong> - Scannez dans un endroit bien éclairé sans ombres</li>
                <li><strong>Stabilité</strong> - Maintenez l'appareil stable pour éviter le flou</li>
                <li><strong>Document à Plat</strong> - Aplatissez bien le document avant de scanner</li>
                <li><strong>Contraste</strong> - Utilisez un fond uni contrastant avec le document</li>
                <li><strong>Cadrage</strong> - Cadrez le document entièrement dans la vue</li>
              </ul>

              <h3>Scanner PDF vs Scanner Physique</h3>
              <ul>
                <li><strong>Mobilité</strong> - Scannez n'importe où avec votre téléphone</li>
                <li><strong>Coût</strong> - Gratuit, pas besoin d'acheter un scanner</li>
                <li><strong>Rapidité</strong> - Scan instantané sans configuration</li>
                <li><strong>Accessibilité</strong> - Disponible 24/7 depuis n'importe où</li>
                <li><strong>Espace</strong> - Pas d'équipement encombrant à stocker</li>
              </ul>

              <h3>Foire Aux Questions</h3>

              <h4>Comment scanner un document en PDF ?</h4>
              <p>
                Autorisez l'accès à votre caméra (webcam ou mobile), positionnez votre document devant la caméra,
                et capturez des photos claires. Notre outil convertira automatiquement vos photos en un PDF de qualité
                professionnelle que vous pourrez télécharger immédiatement.
              </p>

              <h4>Puis-je scanner avec mon téléphone ?</h4>
              <p>
                Oui, absolument ! Notre scanner fonctionne parfaitement sur mobile. Utilisez la caméra de votre téléphone
                pour scanner des documents et créer des PDF directement depuis votre navigateur. C'est l'outil idéal
                pour scanner en déplacement.
              </p>

              <h4>Le scanner est-il sécurisé ?</h4>
              <p>
                Oui, votre confidentialité est garantie. Tout le traitement est effectué localement dans votre navigateur.
                Vos documents scannés ne sont jamais envoyés à un serveur ou stockés en ligne, assurant une sécurité
                et une confidentialité totales.
              </p>

              <h3>Outils Connexes</h3>
              <ul>
                <li><Link href={`/${locale}/ocr`} className="text-primary hover:underline">OCR PDF</Link> - Extraire texte de scans PDF</li>
                <li><Link href={`/${locale}/image-to-pdf`} className="text-primary hover:underline">Image vers PDF</Link> - Convertir images en PDF</li>
                <li><Link href={`/${locale}/compress-pdf`} className="text-primary hover:underline">Compresser PDF</Link> - Réduire la taille du scan</li>
              </ul>
            </>
          ) : (
            <>
              <h2>Scan PDF Online - Free Tool</h2>
              <p>
                Our online PDF scanner allows you to digitize physical documents directly from your browser.
                Use your computer webcam or mobile phone camera to create professional-quality PDFs.
                No need for a physical scanner - your camera is enough! Our tool processes everything locally for complete privacy.
              </p>

              <h3>How to Scan a Document to PDF</h3>
              <ol>
                <li><strong>Enable camera</strong> - Allow access to your webcam or mobile camera</li>
                <li><strong>Capture document</strong> - Take clear photos of each page</li>
                <li><strong>Download PDF</strong> - Get your digitized document as PDF</li>
              </ol>

              <h3>Scanner Features</h3>
              <ul>
                <li><strong>Mobile Scanner</strong> - Use your phone as a portable scanner</li>
                <li><strong>Webcam Scanner</strong> - Digitize with your computer camera</li>
                <li><strong>Multi-Page</strong> - Scan multiple pages into one PDF</li>
                <li><strong>Auto Detection</strong> - Edge detection and perspective correction</li>
                <li><strong>Image Enhancement</strong> - Automatic quality optimization</li>
                <li><strong>Auto Rotation</strong> - Automatic page orientation correction</li>
              </ul>

              <h3>Use Cases</h3>
              <ul>
                <li><strong>Professional Documents</strong> - Scan contracts, invoices, reports</li>
                <li><strong>Administrative Documents</strong> - Scan forms, certificates, attestations</li>
                <li><strong>Notes and Courses</strong> - Digitize handwritten notes and course materials</li>
                <li><strong>Receipts and Invoices</strong> - Keep digital copies of receipts</li>
                <li><strong>Books and Articles</strong> - Scan book pages and press articles</li>
                <li><strong>Whiteboards</strong> - Capture whiteboard content</li>
              </ul>

              <h3>Benefits of Our PDF Scanner</h3>
              <ul>
                <li><strong>No App Required</strong> - Works directly in browser, no installation</li>
                <li><strong>Cross-Platform</strong> - Compatible with PC, Mac, iOS, Android</li>
                <li><strong>Professional Quality</strong> - Sharp and readable images</li>
                <li><strong>100% Free</strong> - No scan limits, no registration</li>
                <li><strong>Complete Privacy</strong> - Local processing, your documents stay private</li>
                <li><strong>Easy to Use</strong> - Intuitive and simple interface</li>
              </ul>

              <h3>Tips for Quality Scans</h3>
              <ul>
                <li><strong>Good Lighting</strong> - Scan in well-lit area without shadows</li>
                <li><strong>Stability</strong> - Keep device steady to avoid blur</li>
                <li><strong>Flat Document</strong> - Flatten document well before scanning</li>
                <li><strong>Contrast</strong> - Use plain background contrasting with document</li>
                <li><strong>Framing</strong> - Frame entire document in view</li>
              </ul>

              <h3>PDF Scanner vs Physical Scanner</h3>
              <ul>
                <li><strong>Mobility</strong> - Scan anywhere with your phone</li>
                <li><strong>Cost</strong> - Free, no need to buy a scanner</li>
                <li><strong>Speed</strong> - Instant scanning without setup</li>
                <li><strong>Accessibility</strong> - Available 24/7 from anywhere</li>
                <li><strong>Space</strong> - No bulky equipment to store</li>
              </ul>

              <h3>Frequently Asked Questions</h3>

              <h4>How to scan a document to PDF?</h4>
              <p>
                Allow camera access (webcam or mobile), position your document in front of the camera,
                and capture clear photos. Our tool will automatically convert your photos into a professional-quality
                PDF you can download immediately.
              </p>

              <h4>Can I scan with my phone?</h4>
              <p>
                Yes, absolutely! Our scanner works perfectly on mobile. Use your phone's camera to scan documents
                and create PDFs directly from your browser. It's the perfect tool for scanning on the go.
              </p>

              <h4>Is the scanner secure?</h4>
              <p>
                Yes, your privacy is guaranteed. All processing is done locally in your browser. Your scanned documents
                are never sent to a server or stored online, ensuring complete security and confidentiality.
              </p>

              <h3>Related Tools</h3>
              <ul>
                <li><Link href={`/${locale}/ocr`} className="text-primary hover:underline">OCR PDF</Link> - Extract text from scanned PDFs</li>
                <li><Link href={`/${locale}/image-to-pdf`} className="text-primary hover:underline">Image to PDF</Link> - Convert images to PDF</li>
                <li><Link href={`/${locale}/compress-pdf`} className="text-primary hover:underline">Compress PDF</Link> - Reduce scan file size</li>
              </ul>
            </>
          )}
        </div>
      </main>

        <SiteFooter locale={pathname.split('/')[1] || 'en'} />
    </div>
    </>
  )
}
