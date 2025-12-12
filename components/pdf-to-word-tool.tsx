"use client"

import {useCallback, useState} from 'react'
import {useDropzone} from 'react-dropzone'
import {useTranslations} from 'next-intl'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Progress} from '@/components/ui/progress'
import {Alert, AlertDescription} from '@/components/ui/alert'
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog'
import {Badge} from '@/components/ui/badge'
import {AlertCircle, CheckCircle2, Download, FileText, FileType, Image as ImageIcon, Loader2, Scan, Upload, X} from 'lucide-react'
import {toast} from 'sonner'
import {EmailShareButton} from '@/components/email-share-button'
import * as pdfjsLib from 'pdfjs-dist'
import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
} from 'docx'
import {createOCREngine} from '@/lib/ocr/ocr-engine'

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`
}

interface FileItem {
  id: string
  file: File
  status: 'pending' | 'converting' | 'completed' | 'error'
  downloadUrl?: string
  error?: string
  progress?: number
  extractedPages?: ExtractedPage[]
  conversionMethod?: 'text' | 'image' | 'ocr'
}

interface TextItem {
  str: string
  transform: number[]
  width: number
  height: number
  fontName?: string
  hasEOL?: boolean
  dir?: string
}

interface ExtractedImage {
  data: Uint8Array
  width: number
  height: number
  y: number
}

interface ExtractedPage {
  pageNumber: number
  text: string
  items: any[]
  hasText: boolean
  canvas?: HTMLCanvasElement
  images?: ExtractedImage[]
  viewport?: any
}

export function PDFToWordTool() {
  const t = useTranslations()
  const [files, setFiles] = useState<FileItem[]>([])
  const [currentFileId, setCurrentFileId] = useState<string | null>(null)
  const [showScannedDialog, setShowScannedDialog] = useState(false)
  const [scannedPagesCount, setScannedPagesCount] = useState(0)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(f => f.type === 'application/pdf')

    if (validFiles.length === 0) {
      toast.error('Invalid file type')
      return
    }

    const newFiles: FileItem[] = validFiles.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      status: 'pending' as const,
      progress: 0
    }))

    setFiles(prev => [...prev, ...newFiles])
    toast.success(`${validFiles.length} file(s) added to queue`)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true,
  })

  const extractTextFromPDF = async (file: File, fileId: string): Promise<ExtractedPage[]> => {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const pages: ExtractedPage[] = []
    let totalImagesExtracted = 0 // Track total images across all pages

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 1.5 })
      const textContent = await page.getTextContent()

      // Extract images from the page - use a more reliable method
      const images: ExtractedImage[] = []

      try {
        // Get all resources including images
        const operatorList = await page.getOperatorList()

        // Track graphics state stack for proper positioning
        const transformStack: number[][] = []
        let currentTransform = [1, 0, 0, 1, 0, 0]

        for (let i = 0; i < operatorList.fnArray.length; i++) {
          const op = operatorList.fnArray[i]

          // Track save/restore graphics state
          if (op === pdfjsLib.OPS.save) {
            transformStack.push([...currentTransform])
          } else if (op === pdfjsLib.OPS.restore) {
            if (transformStack.length > 0) {
              currentTransform = transformStack.pop()!
            }
          } else if (op === pdfjsLib.OPS.transform) {
            // Multiply the current transform with the new one
            const m = operatorList.argsArray[i]
            const [a1, b1, c1, d1, e1, f1] = currentTransform
            const [a2, b2, c2, d2, e2, f2] = m
            currentTransform = [
              a1 * a2 + b1 * c2,
              a1 * b2 + b1 * d2,
              c1 * a2 + d1 * c2,
              c1 * b2 + d1 * d2,
              e1 * a2 + f1 * c2 + e2,
              e1 * b2 + f1 * d2 + f2
            ]
          }

          // Look for image painting operations
          if (op === pdfjsLib.OPS.paintImageXObject) {
            try {
              const imageName = operatorList.argsArray[i][0]

              // Wait for the image object to be loaded
              const image = await page.objs.get(imageName)

              if (image) {

                // Create canvas to convert image
                const canvas = document.createElement('canvas')
                canvas.width = image.width
                canvas.height = image.height
                const ctx = canvas.getContext('2d')

                if (ctx) {
                  // Try using bitmap if data is not available
                  if (image.bitmap) {
                    ctx.drawImage(image.bitmap, 0, 0)
                  } else if (image.data) {
                    const imageData = ctx.createImageData(image.width, image.height)
                    const data = imageData.data

                    // Handle different color spaces
                    if (image.kind === 1) {
                      // Grayscale
                      for (let j = 0; j < image.data.length; j++) {
                        const idx = j * 4
                        data[idx] = image.data[j]
                        data[idx + 1] = image.data[j]
                        data[idx + 2] = image.data[j]
                        data[idx + 3] = 255
                      }
                    } else if (image.kind === 2) {
                      // RGB
                      for (let j = 0, k = 0; j < image.data.length; j += 3, k += 4) {
                        data[k] = image.data[j]
                        data[k + 1] = image.data[j + 1]
                        data[k + 2] = image.data[j + 2]
                        data[k + 3] = 255
                      }
                    } else if (image.kind === 3) {
                      // RGBA
                      for (let j = 0; j < image.data.length; j++) {
                        data[j] = image.data[j]
                      }
                    } else {
                      // Unknown kind - try intelligent detection
                      const totalPixels = image.width * image.height
                      const bytesPerPixel = image.data.length / totalPixels

                      if (Math.abs(bytesPerPixel - 1) < 0.1) {
                        // Likely grayscale
                        for (let j = 0; j < image.data.length; j++) {
                          const idx = j * 4
                          data[idx] = image.data[j]
                          data[idx + 1] = image.data[j]
                          data[idx + 2] = image.data[j]
                          data[idx + 3] = 255
                        }
                      } else if (Math.abs(bytesPerPixel - 3) < 0.1) {
                        // Likely RGB
                        for (let j = 0, k = 0; j < image.data.length; j += 3, k += 4) {
                          data[k] = image.data[j]
                          data[k + 1] = image.data[j + 1]
                          data[k + 2] = image.data[j + 2]
                          data[k + 3] = 255
                        }
                      } else if (Math.abs(bytesPerPixel - 4) < 0.1) {
                        // Likely RGBA
                        for (let j = 0; j < image.data.length; j++) {
                          data[j] = image.data[j]
                        }
                      } else {
                        // Last resort fallback
                        for (let j = 0; j < totalPixels && j * 4 < data.length; j++) {
                          data[j * 4] = image.data[j] || 0
                          data[j * 4 + 1] = image.data[j] || 0
                          data[j * 4 + 2] = image.data[j] || 0
                          data[j * 4 + 3] = 255
                        }
                      }
                    }

                    ctx.putImageData(imageData, 0, 0)
                  } else {
                    console.warn(`Image ${imageName} has no data or bitmap`)
                    continue
                  }

                  // Convert to PNG
                  const dataUrl = canvas.toDataURL('image/png')
                  const base64Data = dataUrl.split(',')[1]
                  const binaryString = atob(base64Data)
                  const bytes = new Uint8Array(binaryString.length)
                  for (let k = 0; k < binaryString.length; k++) {
                    bytes[k] = binaryString.charCodeAt(k)
                  }

                  // Y position from accumulated transform matrix
                  // Transform matrix format: [a, b, c, d, e, f]
                  // where: x' = ax + cy + e, y' = bx + dy + f
                  // For images, the origin (0,0) maps to (e, f)
                  const [a, b, c, d, e, f] = currentTransform

                  // The bottom-left corner of the image in PDF coordinates
                  const yBottom = f
                  const imageHeight = d // Y-scale gives us the height

                  // For better positioning with text, use the center or bottom of image
                  // Text baseline is typically their Y position, so we'll use image bottom
                  const imageY = yBottom

                  images.push({
                    data: bytes,
                    width: image.width,
                    height: image.height,
                    y: imageY
                  })
                }
              }
            } catch (err) {
              console.error('Failed to extract image:', err, err.stack)
            }
          }
        }

      } catch (err) {
        console.error('Error during image extraction:', err)
      }

      // Extract text with positioning info
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')

      // Check if page has meaningful text
      const hasText = pageText.trim().length > 10

      // If no text, render page to canvas for image extraction
      let canvas: HTMLCanvasElement | undefined
      if (!hasText) {
        canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const context = canvas.getContext('2d')
        if (context) {
          await page.render({
            canvasContext: context,
            viewport: viewport,
          } as any).promise
        }
      }

      // If we have images with unreasonable Y positions, try to fix them based on figure captions
      if (images.length > 0) {
        images.forEach((image, idx) => {
          if (image.y > 10000 || image.y < 0) {
            // Calculate the figure number based on total images extracted so far
            const figureNumber = totalImagesExtracted + idx + 1

            // Find "Figure X:" in text items to estimate position
            const figureRegex = new RegExp(`Figure\\s+${figureNumber}:`, 'i')
            const figureItem = textContent.items.find((item: any) =>
              figureRegex.test(item.str)
            )

            if (figureItem) {
              // Place image slightly above the figure caption
              const captionY = figureItem.transform[5]
              image.y = captionY + 50 // Place 50 units above caption
            } else {
              console.warn(`Image ${idx} (Figure ${figureNumber}) has unusual Y=${image.y}, no Figure caption found`)
            }
          }
        })
      }

      // Update total images count
      totalImagesExtracted += images.length

      pages.push({
        pageNumber: pageNum,
        text: pageText,
        items: textContent.items,
        hasText,
        canvas,
        images: images.length > 0 ? images : undefined,
        viewport
      })

      setFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, progress: (pageNum / pdf.numPages) * 20 } : f
      ))
    }

    return pages
  }

  const performOCR = async (pages: ExtractedPage[], fileId: string): Promise<ExtractedPage[]> => {
    toast.info('Initializing OCR engine...')
    const ocrEngine = await createOCREngine('eng')
    const ocrResults: ExtractedPage[] = []

    try {
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]

        if (!page.hasText && page.canvas) {
          toast.info(`Performing OCR on page ${page.pageNumber}...`)
          setFiles(prev => prev.map(f =>
            f.id === fileId ? { ...f, progress: 20 + ((i + 1) / pages.length) * 40 } : f
          ))

          const result = await ocrEngine.recognize(page.canvas)

          ocrResults.push({
            ...page,
            text: result.text,
            hasText: true,
          })
        } else {
          ocrResults.push(page)
        }
      }

      return ocrResults
    } finally {
      await ocrEngine.terminate()
    }
  }

  const createWordDocumentWithImages = async (pages: ExtractedPage[], fileId: string): Promise<Blob> => {
    const children: (Paragraph | Table)[] = []

    for (let index = 0; index < pages.length; index++) {
      const page = pages[index]

      if (!page.hasText && page.canvas) {
        // Page has scanned image, convert to blob then to array buffer
        try {
          const dataUrl = page.canvas.toDataURL('image/png')
          const base64Data = dataUrl.split(',')[1]
          const binaryString = atob(base64Data)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }

          const maxWidth = 600
          const scale = Math.min(maxWidth / page.canvas.width, 1)
          const width = Math.round(page.canvas.width * scale)
          const height = Math.round(page.canvas.height * scale)

          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: bytes,
                  transformation: { width, height },
                }),
              ],
              spacing: {
                before: index > 0 ? 400 : 0,
                after: 200
              },
            })
          )
        } catch (err) {
          console.error('Failed to embed scanned image:', err)
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `[Image from page ${page.pageNumber} could not be embedded]`,
                  italics: true,
                })
              ],
              spacing: { after: 200 },
            })
          )
        }
      } else {
        // Use the same comprehensive logic as createWordDocument
        const pageWidth = page.viewport?.width || 600
        const contentItems: Array<{type: 'text' | 'image' | 'table', y: number, data: any}> = []

        // Add images with their Y positions
        if (page.images && page.images.length > 0) {
          page.images.forEach((image, idx) => {
            contentItems.push({
              type: 'image',
              y: image.y,
              data: image
            })
          })
        } else {
          console.log(`Page ${page.pageNumber} (with images): No images found`)
        }

        // Analyze text layout
        const textItems = page.items as TextItem[]
        const rowGroups = groupTextItemsByY(textItems, 5)
        const rows = Array.from(rowGroups.entries()).sort((a, b) => b[0] - a[0])

        // Detect tables
        const tableRanges = detectTableRanges(rows)

        // Separate table and non-table content
        const tableRows: Array<{y: number, items: TextItem[]}> = []
        const normalRows: Array<{y: number, items: TextItem[]}> = []

        rows.forEach(([y, items]) => {
          const isInTable = tableRanges.some(range => y >= range.start && y <= range.end)
          if (isInTable) {
            tableRows.push({y, items})
          } else {
            normalRows.push({y, items})
          }
        })

        // Add table content items
        if (tableRows.length > 0) {
          const avgY = tableRows.reduce((sum, row) => sum + row.y, 0) / tableRows.length
          contentItems.push({
            type: 'table',
            y: avgY,
            data: tableRows
          })
        }

        // Add normal text content items
        normalRows.forEach(({y, items}) => {
          contentItems.push({
            type: 'text',
            y,
            data: items
          })
        })

        // Sort all content by Y position (top to bottom)
        contentItems.sort((a, b) => b.y - a.y)

        // Process content in order
        for (const item of contentItems) {
          if (item.type === 'image') {
            try {
              const image = item.data as ExtractedImage
              const maxWidth = 600
              const scale = Math.min(maxWidth / image.width, 1)
              const width = Math.round(image.width * scale)
              const height = Math.round(image.height * scale)

              children.push(
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: image.data,
                      transformation: { width, height },
                    }),
                  ],
                  spacing: { before: 200, after: 200 },
                  alignment: AlignmentType.CENTER,
                })
              )
            } catch (err) {
              console.error('Failed to embed image:', err)
            }
          } else if (item.type === 'table') {
            try {
              const tableData = item.data as Array<{y: number, items: TextItem[]}>
              const table = createTableFromRows(tableData, pageWidth)
              if (table) {
                children.push(table)
              }
            } catch (err) {
              console.error('Failed to create table:', err)
            }
          } else if (item.type === 'text') {
            try {
              const textItems = item.data as TextItem[]
              const paragraph = createParagraphFromItems(textItems, pageWidth)
              if (paragraph) {
                children.push(paragraph)
              }
            } catch (err) {
              console.error('Failed to create paragraph:', err)
            }
          }
        }
      }

      setFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, progress: 60 + ((index + 1) / pages.length) * 40 } : f
      ))
    }


    const doc = new Document({
      sections: [{ properties: {}, children }],
    })

    const blob = await Packer.toBlob(doc)
    return blob
  }

  const createWordDocument = async (pages: ExtractedPage[], fileId: string): Promise<Blob> => {
    const children: (Paragraph | Table)[] = []

    for (let index = 0; index < pages.length; index++) {
      const page = pages[index]
      const pageWidth = page.viewport?.width || 600

      // Group text items and images by Y position for proper ordering
      const contentItems: Array<{type: 'text' | 'image' | 'table', y: number, data: any}> = []

      // Add images with their Y positions
      if (page.images && page.images.length > 0) {
        page.images.forEach((image, idx) => {
          contentItems.push({
            type: 'image',
            y: image.y,
            data: image
          })
        })
      } else {
        console.log(`Page ${page.pageNumber}: No images found`)
      }

      // Analyze text layout
      const textItems = page.items as TextItem[]

      // Group text items by Y position (rows)
      const rowGroups = groupTextItemsByY(textItems, 5)
      const rows = Array.from(rowGroups.entries()).sort((a, b) => b[0] - a[0]) // Sort top to bottom

      // Detect tables
      const tableRanges = detectTableRanges(rows)

      // Separate table and non-table content
      const tableRows: Array<{y: number, items: TextItem[]}> = []
      const normalRows: Array<{y: number, items: TextItem[]}> = []

      rows.forEach(([y, items]) => {
        const isInTable = tableRanges.some(range => y >= range.start && y <= range.end)
        if (isInTable) {
          tableRows.push({y, items})
        } else {
          normalRows.push({y, items})
        }
      })

      // Add table content items
      if (tableRows.length > 0) {
        const avgY = tableRows.reduce((sum, row) => sum + row.y, 0) / tableRows.length
        contentItems.push({
          type: 'table',
          y: avgY,
          data: tableRows
        })
      }

      // Add normal text content items
      normalRows.forEach(({y, items}) => {
        const rowText = items.map(i => i.str).join(' ').substring(0, 50)
        contentItems.push({
          type: 'text',
          y,
          data: items
        })
      })

      // Sort all content by Y position (top to bottom)
      // In PDF coordinates, Y increases from bottom to top, so higher Y = top of page
      // We want to process from top to bottom, so sort by Y descending
      contentItems.sort((a, b) => b.y - a.y)

      // Process content in order
      for (const item of contentItems) {
        if (item.type === 'image') {
          try {
            const image = item.data as ExtractedImage
            const maxWidth = 600
            const scale = Math.min(maxWidth / image.width, 1)
            const width = Math.round(image.width * scale)
            const height = Math.round(image.height * scale)


            children.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: image.data,
                    transformation: { width, height },
                  }),
                ],
                spacing: { before: 200, after: 200 },
                alignment: AlignmentType.CENTER,
              })
            )
          } catch (err) {
            console.error('Failed to embed image:', err)
          }
        } else if (item.type === 'table') {
          try {
            const tableData = item.data as Array<{y: number, items: TextItem[]}>
            const table = createTableFromRows(tableData, pageWidth)
            if (table) {
              children.push(table)
            }
          } catch (err) {
            console.error('Failed to create table:', err)
          }
        } else if (item.type === 'text') {
          try {
            const textItems = item.data as TextItem[]
            const paragraph = createParagraphFromItems(textItems, pageWidth)
            if (paragraph) {
              children.push(paragraph)
            }
          } catch (err) {
            console.error('Failed to create paragraph:', err)
          }
        }
      }

      setFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, progress: 60 + ((index + 1) / pages.length) * 40 } : f
      ))
    }

    const doc = new Document({
      sections: [{ properties: {}, children }],
    })

    return await Packer.toBlob(doc)
  }

  // Helper: Group text items by Y position
  const groupTextItemsByY = (items: TextItem[], tolerance: number): Map<number, TextItem[]> => {
    const groups = new Map<number, TextItem[]>()

    items.forEach(item => {
      const y = item.transform[5]
      let foundGroup = false

      for (const [existingY, group] of groups) {
        if (Math.abs(y - existingY) < tolerance) {
          group.push(item)
          foundGroup = true
          break
        }
      }

      if (!foundGroup) {
        groups.set(y, [item])
      }
    })

    // Sort items in each group by X position
    groups.forEach(group => {
      group.sort((a, b) => a.transform[4] - b.transform[4])
    })

    return groups
  }

  // Helper: Detect table ranges
  const detectTableRanges = (rows: Array<[number, TextItem[]]>): Array<{start: number, end: number}> => {
    const ranges: Array<{start: number, end: number}> = []
    let currentRange: {start: number, end: number} | null = null

    for (let i = 0; i < rows.length - 1; i++) {
      const [y1, items1] = rows[i]
      const [y2, items2] = rows[i + 1]

      // Check if both rows have multiple items and similar structure
      if (items1.length > 1 && items2.length > 1 &&
          Math.abs(items1.length - items2.length) <= 1) {

        // Check for column alignment
        const x1Positions = items1.map(item => item.transform[4])
        const x2Positions = items2.map(item => item.transform[4])

        let alignedColumns = 0
        x1Positions.forEach(x1 => {
          if (x2Positions.some(x2 => Math.abs(x1 - x2) < 10)) {
            alignedColumns++
          }
        })

        if (alignedColumns >= Math.min(items1.length, items2.length) * 0.5) {
          if (!currentRange) {
            currentRange = {start: y1, end: y2}
          } else {
            currentRange.end = y2
          }
        } else {
          if (currentRange) {
            ranges.push(currentRange)
            currentRange = null
          }
        }
      } else {
        if (currentRange) {
          ranges.push(currentRange)
          currentRange = null
        }
      }
    }

    if (currentRange) {
      ranges.push(currentRange)
    }

    return ranges
  }

  // Helper: Create table from rows
  const createTableFromRows = (rows: Array<{y: number, items: TextItem[]}>, pageWidth: number): Table | null => {
    if (rows.length === 0) return null

    // Determine column count (max items in any row)
    const maxCols = Math.max(...rows.map(row => row.items.length))

    const tableRows = rows.map(row => {
      const cells = []

      for (let i = 0; i < maxCols; i++) {
        const item = row.items[i]
        const text = item ? item.str : ''
        const fontSize = item?.height ? Math.round(item.height * 2) : 22
        const fontName = item?.fontName || 'Calibri'
        const isBold = fontName.toLowerCase().includes('bold')

        cells.push(
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text,
                    size: fontSize,
                    font: fontName.replace(/-(Bold|Italic|BoldItalic)/gi, ''),
                    bold: isBold,
                  })
                ],
              })
            ],
            width: {
              size: 100 / maxCols,
              type: WidthType.PERCENTAGE,
            },
          })
        )
      }

      return new TableRow({ children: cells })
    })

    return new Table({
      rows: tableRows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
    })
  }

  // Helper: Create paragraph from text items
  const createParagraphFromItems = (items: TextItem[], pageWidth: number): Paragraph | null => {
    if (items.length === 0) return null

    // Get full text to check
    const fullText = items.map(i => i.str).join('').trim()

    // Skip page numbers
    // Pattern 1: Just a single digit or number (1, 2, 3, etc.)
    // Pattern 2: Number with dots (1..., 2..., etc.)
    // But exclude section numbers like "2.1", "2.2", etc.
    if (/^\d+\.{0,}$/.test(fullText) && !fullText.includes('.') || /^\d+\.{2,}$/.test(fullText)) {
      // Additional check: if it's a single number and Y position is low (bottom of page)
      // or if there's only one or two items in this row
      const avgY = items.reduce((sum, item) => sum + item.transform[5], 0) / items.length
      if (items.length <= 2 || avgY < 100) {
        return null
      }
    }

    // Detect alignment
    const avgX = items.reduce((sum, item) => sum + item.transform[4], 0) / items.length
    const leftMargin = avgX
    const rightMargin = pageWidth - avgX - items.reduce((sum, item) => sum + item.width, 0) / items.length

    let alignment = AlignmentType.LEFT
    if (leftMargin > pageWidth * 0.35 && rightMargin > pageWidth * 0.35) {
      alignment = AlignmentType.CENTER
    } else if (rightMargin < leftMargin * 0.5) {
      alignment = AlignmentType.RIGHT
    }

    // Detect if it's a list item
    const isBulletList = /^[•·○●■□▪▫-]\s/.test(fullText)
    const isNumberedList = /^\d+[\.\)]\s/.test(fullText)

    // Build text runs with formatting
    const textRuns: TextRun[] = []

    items.forEach((item, index) => {
      if (!item.str) return

      const fontSize = item.height ? Math.round(item.height * 2) : 22
      const fontName = item.fontName || 'Calibri'
      const isBold = fontName.toLowerCase().includes('bold')
      const isItalic = fontName.toLowerCase().includes('italic')

      // Detect if text is heading (larger font or all caps)
      const isLikelyHeading = fontSize > 28 || (item.str === item.str.toUpperCase() && item.str.length > 3 && item.str.length < 100)

      textRuns.push(
        new TextRun({
          text: item.str + (item.hasEOL ? '' : (index < items.length - 1 ? ' ' : '')),
          size: fontSize,
          font: fontName.replace(/-(Bold|Italic|BoldItalic)/gi, ''),
          bold: isBold || isLikelyHeading,
          italics: isItalic,
        })
      )
    })

    if (textRuns.length === 0) return null

    // Determine if this is a heading
    const avgFontSize = items.reduce((sum, item) => sum + (item.height || 11), 0) / items.length
    const isHeading = avgFontSize > 14 || fullText === fullText.toUpperCase() && fullText.length < 100

    return new Paragraph({
      children: textRuns,
      alignment,
      heading: isHeading ? HeadingLevel.HEADING_2 : undefined,
      spacing: {
        before: isHeading ? 240 : 120,
        after: isHeading ? 120 : 120,
      },
      bullet: isBulletList ? { level: 0 } : undefined,
      numbering: isNumberedList ? { reference: 'default-numbering', level: 0 } : undefined,
    })
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const convertFile = async (fileId: string) => {
    const fileItem = files.find(f => f.id === fileId)
    if (!fileItem) return

    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, status: 'converting', progress: 0 } : f
    ))

    try {
      toast.info(`Extracting text from ${fileItem.file.name}...`)
      const pages = await extractTextFromPDF(fileItem.file, fileId)

      // Check if any pages are scanned (no text)
      const scannedPages = pages.filter(p => !p.hasText)

      if (scannedPages.length > 0) {
        // Show dialog to ask user preference
        setFiles(prev => prev.map(f =>
          f.id === fileId ? { ...f, extractedPages: pages, status: 'pending' } : f
        ))
        setCurrentFileId(fileId)
        setScannedPagesCount(scannedPages.length)
        setShowScannedDialog(true)
        return
      }

      // All pages have text, proceed normally
      await finishConversion(fileId, pages, 'text')
    } catch (error) {
      console.error('Conversion error:', error)
      setFiles(prev => prev.map(f =>
        f.id === fileId ? {
          ...f,
          status: 'error',
          error: 'Failed to convert PDF to Word. Please try again.'
        } : f
      ))
      toast.error(`Conversion failed for ${fileItem.file.name}`)
    }
  }

  const convertAll = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending')

    for (const fileItem of pendingFiles) {
      await convertFile(fileItem.id)
    }
  }

  const handleScannedPagesChoice = async (choice: 'image' | 'ocr') => {
    setShowScannedDialog(false)

    if (!currentFileId) return

    const fileItem = files.find(f => f.id === currentFileId)
    if (!fileItem || !fileItem.extractedPages) return

    setFiles(prev => prev.map(f =>
      f.id === currentFileId ? { ...f, status: 'converting', conversionMethod: choice } : f
    ))

    try {
      if (choice === 'ocr') {
        // Perform OCR on scanned pages
        toast.info('Performing OCR on scanned pages...')
        const ocrPages = await performOCR(fileItem.extractedPages, currentFileId)
        await finishConversion(currentFileId, ocrPages, 'ocr')
      } else {
        // Keep images
        await finishConversion(currentFileId, fileItem.extractedPages, 'image')
      }
    } catch (error) {
      console.error('Conversion error:', error)
      setFiles(prev => prev.map(f =>
        f.id === currentFileId ? {
          ...f,
          status: 'error',
          error: 'Failed to convert PDF to Word. Please try again.'
        } : f
      ))
      toast.error('Conversion failed')
    } finally {
      setCurrentFileId(null)
    }
  }

  const finishConversion = async (fileId: string, pages: ExtractedPage[], method: 'text' | 'image' | 'ocr') => {
    const fileItem = files.find(f => f.id === fileId)
    if (!fileItem) return

    try {
      let blob: Blob

      if (method === 'image') {
        blob = await createWordDocumentWithImages(pages, fileId)
      } else {
        blob = await createWordDocument(pages, fileId)
      }

      // Create download URL
      const url = URL.createObjectURL(blob)

      setFiles(prev => prev.map(f =>
        f.id === fileId ? {
          ...f,
          status: 'completed',
          progress: 100,
          downloadUrl: url,
          conversionMethod: method
        } : f
      ))

      toast.success(`${fileItem.file.name} converted successfully!`, {
        description: `${pages.length} pages converted`,
      })
    } catch (error) {
      setFiles(prev => prev.map(f =>
        f.id === fileId ? {
          ...f,
          status: 'error',
          error: 'Failed to create Word document'
        } : f
      ))
      throw error
    }
  }

  const generateBlobForFile = (fileId: string) => async (): Promise<Blob | null> => {
    const fileItem = files.find(f => f.id === fileId)
    if (!fileItem || !fileItem.downloadUrl) return null

    try {
      const response = await fetch(fileItem.downloadUrl)
      return await response.blob()
    } catch (error) {
      console.error('Error generating blob:', error)
      return null
    }
  }

  const downloadFile = (fileId: string) => {
    const fileItem = files.find(f => f.id === fileId)
    if (!fileItem || !fileItem.downloadUrl) return

    const link = document.createElement('a')
    link.href = fileItem.downloadUrl
    link.download = fileItem.file.name.replace('.pdf', '.docx')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const reset = () => {
    // Cleanup blob URLs
    files.forEach(f => {
      if (f.downloadUrl) {
        URL.revokeObjectURL(f.downloadUrl)
      }
    })
    setFiles([])
    setCurrentFileId(null)
    setShowScannedDialog(false)
    setScannedPagesCount(0)
  }

  const pendingFiles = files.filter(f => f.status === 'pending')
  const convertingFiles = files.filter(f => f.status === 'converting')
  const completedFiles = files.filter(f => f.status === 'completed')
  const errorFiles = files.filter(f => f.status === 'error')

  const getStatusBadge = (status: FileItem['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'converting':
        return <Badge variant="default" className="bg-blue-500">Converting</Badge>
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileType className="h-6 w-6" />
            {t('tools.pdfToWord.heading')}
          </CardTitle>
          <CardDescription>{t('tools.pdfToWord.intro')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer ${
              isDragActive ? 'border-primary bg-primary/5' : ''
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg mb-2">{t('fileUpload.dragDrop', { type: t('fileUpload.pdf') })}</p>
            <p className="text-sm text-muted-foreground mb-4">{t('fileUpload.or')}</p>
            <Button variant="secondary">{t('fileUpload.browse')}</Button>
          </div>

          {/* Pending & Converting Files */}
          {(pendingFiles.length > 0 || convertingFiles.length > 0) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">File Queue</h3>
                {pendingFiles.length > 0 && (
                  <Button onClick={convertAll} disabled={convertingFiles.length > 0}>
                    <FileType className="mr-2 h-4 w-4" />
                    Convert All ({pendingFiles.length})
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {[...pendingFiles, ...convertingFiles].map((fileItem) => (
                  <Card key={fileItem.id}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <FileText className="h-8 w-8 text-primary shrink-0 mt-1" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{fileItem.file.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {getStatusBadge(fileItem.status)}
                            {fileItem.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => convertFile(fileItem.id)}
                                  disabled={convertingFiles.length > 0}
                                >
                                  Convert
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeFile(fileItem.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>

                        {fileItem.status === 'converting' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                {t('tools.pdfToWord.converting')}
                              </span>
                              <span className="font-medium">{Math.round(fileItem.progress || 0)}%</span>
                            </div>
                            <Progress value={fileItem.progress || 0} className="h-2" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Completed Files */}
          {completedFiles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Completed Conversions</h3>
              <div className="space-y-3">
                {completedFiles.map((fileItem) => (
                  <Card key={fileItem.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0 mt-1" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{fileItem.file.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Converted to {fileItem.file.name.replace('.pdf', '.docx')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {getStatusBadge(fileItem.status)}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => downloadFile(fileItem.id)}
                              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </Button>
                            <EmailShareButton
                              onGenerateBlob={generateBlobForFile(fileItem.id)}
                              fileName={fileItem.file.name.replace('.pdf', '.docx')}
                              shareMessage="I've converted a PDF to Word using Mon PDF."
                              className="sm:w-auto w-full"
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeFile(fileItem.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Error Files */}
          {errorFiles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Failed Conversions</h3>
              <div className="space-y-3">
                {errorFiles.map((fileItem) => (
                  <Card key={fileItem.id}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <AlertCircle className="h-8 w-8 text-destructive shrink-0 mt-1" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{fileItem.file.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {getStatusBadge(fileItem.status)}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setFiles(prev => prev.map(f =>
                                  f.id === fileItem.id ? { ...f, status: 'pending', error: undefined } : f
                                ))
                              }}
                            >
                              Retry
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeFile(fileItem.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {fileItem.error && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{fileItem.error}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Clear All Button */}
          {files.length > 0 && (
            <Button variant="outline" onClick={reset} className="w-full">
              Clear All Files
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Scanned Pages Dialog */}
      <Dialog open={showScannedDialog} onOpenChange={setShowScannedDialog}>
        <DialogContent className="flex flex-col sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              {t('tools.pdfToWord.scannedDialogTitle')}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {t('tools.pdfToWord.scannedDialogDescription', { count: scannedPagesCount })}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col space-y-3 py-4">
            <Button
              onClick={() => handleScannedPagesChoice('image')}
              variant="outline"
              className="w-full h-auto py-3 px-3 flex items-start gap-3 hover:bg-primary/5 text-left cursor-pointer"
            >
              <ImageIcon className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="font-semibold mb-1">{t('tools.pdfToWord.keepImagesTitle')}</div>
                <div className="text-xs text-muted-foreground font-normal leading-tight break-words whitespace-normal">
                  {t('tools.pdfToWord.keepImagesDescription')}
                </div>
              </div>
            </Button>

            <Button
              onClick={() => handleScannedPagesChoice('ocr')}
              variant="outline"
              className="w-full h-auto py-3 px-3 flex items-start gap-3 hover:bg-primary/5 text-left cursor-pointer"
            >
              <Scan className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="font-semibold mb-1">{t('tools.pdfToWord.useOcrTitle')}</div>
                <div className="text-xs text-muted-foreground font-normal leading-tight break-words whitespace-normal">
                  {t('tools.pdfToWord.useOcrDescription')}
                </div>
              </div>
            </Button>
          </div>

          <DialogFooter className="flex-row items-center justify-center gap-2 text-xs text-muted-foreground sm:justify-center">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="text-center">{t('tools.pdfToWord.dialogNote')}</span>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
