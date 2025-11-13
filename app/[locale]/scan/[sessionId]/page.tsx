import MobileScanPageClient from './page-client'

export default function MobileScanPage({ params }: { params: Promise<{ sessionId: string }> }) {
  return <MobileScanPageClient params={params} />
}
