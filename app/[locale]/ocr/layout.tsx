import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PDF OCR - Extract Text from Scanned PDFs | Mon PDF',
  description: 'Extract text from scanned PDFs using OCR. Browser-based, no upload required. Detect tables, key-value pairs, and export data in CSV, JSON, or TXT format.',
}

export default function OCRLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
