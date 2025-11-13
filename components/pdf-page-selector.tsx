"use client"

import { useEffect, useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import * as pdfjs from "pdfjs-dist";

interface PDFPageSelectorProps {
  file: File
  selectedPages: Set<number>
  onPageToggle: (pageNumber: number) => void
  onSelectAll?: () => void
  onDeselectAll?: () => void
}

export function PDFPageSelector({
  file,
  selectedPages,
  onPageToggle,
}: PDFPageSelectorProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageImages, setPageImages] = useState<Map<number, string>>(new Map())
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let isMounted = true

    const loadPDF = async () => {
      setLoading(true)
      setPageImages(new Map())

      try {
        // Dynamically import pdfjs-dist to avoid SSR issues
        const pdfjsLib = await import("pdfjs-dist")

        // Configure PDF.js worker - use unpkg CDN with correct path
        pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`

        const arrayBuffer = await file.arrayBuffer()
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
        const pdf = await loadingTask.promise

        if (!isMounted) return

        setNumPages(pdf.numPages)

        // Render all pages
        for (let i = 1; i <= pdf.numPages; i++) {
          if (!isMounted) break

          try {
            const page = await pdf.getPage(i)
            const viewport = page.getViewport({ scale: 1 })

            // Create canvas
            const canvas = document.createElement("canvas")
            const context = canvas.getContext("2d")

            if (!context) continue

            // Calculate scale to fit thumbnail (200px width)
            const scale = 200 / viewport.width
            const scaledViewport = page.getViewport({ scale })

            canvas.height = scaledViewport.height
            canvas.width = scaledViewport.width

            // Render page
            await page.render({
              canvasContext: context,
              viewport: scaledViewport,
              canvas: canvas,
            }).promise

            // Convert to image
            const imageUrl = canvas.toDataURL()

            if (isMounted) {
              setPageImages(prev => {
                const newMap = new Map(prev)
                newMap.set(i, imageUrl)
                return newMap
              })
            }
          } catch (pageError) {
            console.error(`Error loading page ${i}:`, pageError)
          }
        }

        if (isMounted) {
          setLoading(false)
        }
      } catch (error) {
        console.error("Error loading PDF:", error)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadPDF()

    // Cleanup
    return () => {
      isMounted = false
    }
  }, [file])

  if (loading && numPages === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading PDF...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {numPages > 0 && (
        <div className="text-sm text-muted-foreground">
          Loaded {pageImages.size} of {numPages} pages
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: numPages }, (_, index) => {
          const pageNumber = index + 1
          const isSelected = selectedPages.has(pageNumber)
          const imageUrl = pageImages.get(pageNumber)

          return (
            <Card
              key={pageNumber}
              className={cn(
                "relative overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]",
                isSelected && "ring-2 ring-primary shadow-xl bg-primary/5"
              )}
              onClick={() => onPageToggle(pageNumber)}
            >
              <div className="absolute top-3 left-3 z-10">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onPageToggle(pageNumber)}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-background border-2 shadow-sm h-5 w-5"
                />
              </div>

              <div className="aspect-[1/1.414] bg-muted flex items-center justify-center p-4">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={`Page ${pageNumber}`}
                    className="w-full h-full object-contain shadow-sm"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <div className="animate-pulse">Loading page {pageNumber}...</div>
                  </div>
                )}
              </div>

              <div className="p-3 text-center bg-background/95 backdrop-blur border-t">
                <p className="text-sm font-medium">Page {pageNumber}</p>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}