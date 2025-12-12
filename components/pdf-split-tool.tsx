"use client"

import {useState} from "react"
import {useTranslations} from 'next-intl'
import {PDFDocument} from "pdf-lib"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {FileUploadZone} from "@/components/file-upload-zone"
import {useAppDispatch, useAppSelector} from "@/lib/hooks"
import {addFiles, clearFiles, setProcessing} from "@/lib/features/pdf-slice"
import {CheckSquare, Download, Scissors, Square} from "lucide-react"
import {PDFPageSelector} from "@/components/pdf-page-selector"
import {EmailShareButton} from "@/components/email-share-button"

export function PDFSplitTool() {
  const t = useTranslations()
  const dispatch = useAppDispatch()
  const { files, processing } = useAppSelector((state) => state.pdf)
  const [pageRange, setPageRange] = useState<string>("")
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())

  const handleFilesSelected = async (fileList: FileList) => {
    // Clear existing files first since this tool only handles one file at a time
    dispatch(clearFiles())

    const newFiles = await Promise.all(
      Array.from(fileList).map(async (file) => {
        const arrayBuffer = await file.arrayBuffer()
        const pdfDoc = await PDFDocument.load(arrayBuffer)
        const pageCount = pdfDoc.getPageCount()

        return {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          file,
          pages: pageCount,
        }
      }),
    )
    dispatch(addFiles(newFiles))
    setSelectedPages(new Set()) // Reset selection when new file is uploaded
    setPageRange("") // Reset page range when new file is uploaded
  }

  const handlePageToggle = (pageNumber: number) => {
    setSelectedPages((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(pageNumber)) {
        newSet.delete(pageNumber)
      } else {
        newSet.add(pageNumber)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (files.length > 0) {
      const allPages = new Set(Array.from({ length: files[0].pages }, (_, i) => i + 1))
      setSelectedPages(allPages)
    }
  }

  const handleDeselectAll = () => {
    setSelectedPages(new Set())
  }

  const generatePDFBlob = async (): Promise<Blob | null> => {
    if (files.length === 0 || selectedPages.size === 0) return null

    try {
      const file = files[0].file
      const sortedPages = Array.from(selectedPages).sort((a, b) => a - b)
      const pagesParam = sortedPages.join(',')

      const formData = new FormData()
      formData.append('file', file)
      formData.append('pages', pagesParam)
      formData.append('mode', 'pages')

      const response = await fetch('/api/split-pdf', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to split PDF')
      }

      return await response.blob()
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to split PDF. Please try again.")
      return null
    }
  }

  const handleDownloadSelected = async () => {
    if (files.length === 0 || selectedPages.size === 0) return

    dispatch(setProcessing(true))

    try {
      const blob = await generatePDFBlob()
      if (!blob) return

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `selected-pages-${files[0].name}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error downloading selected pages:", error)
      alert("Failed to split PDF. Please try again.")
    } finally {
      dispatch(setProcessing(false))
    }
  }

  const handleSplit = async () => {
    if (files.length === 0 || !pageRange) return

    dispatch(setProcessing(true))

    try {
      const file = files[0].file

      const formData = new FormData()
      formData.append('file', file)
      formData.append('pages', pageRange)
      formData.append('mode', 'ranges')

      const response = await fetch('/api/split-pdf', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to split PDF')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `split-${pageRange.replace(/,/g, '-')}-${files[0].name}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error splitting PDF:", error)
      alert("Failed to split PDF. Please try again.")
    } finally {
      dispatch(setProcessing(false))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="h-6 w-6" />
          {t('tools.split.heading')}
        </CardTitle>
        <CardDescription>{t('tools.split.intro')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FileUploadZone onFilesSelected={handleFilesSelected} accept=".pdf" multiple={false} type="pdf" />

        {files.length > 0 && (
          <>
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm font-medium">
                    {files[0].name} ({files[0].pages} {t('tools.split.pages')})
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedPages.size > 0
                      ? t('tools.split.pagesSelected', { count: selectedPages.size })
                      : t('tools.split.selectPages')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSelectAll} variant="outline" size="sm">
                    <CheckSquare className="mr-2 h-4 w-4" />
                    {t('common.selectAll')}
                  </Button>
                  <Button onClick={handleDeselectAll} variant="outline" size="sm">
                    <Square className="mr-2 h-4 w-4" />
                    {t('common.deselectAll')}
                  </Button>
                </div>
              </div>
            </Card>

            <PDFPageSelector
              file={files[0].file}
              selectedPages={selectedPages}
              onPageToggle={handlePageToggle}
            />

            {selectedPages.size > 0 && (
              <Card className="p-6 space-y-4 sticky bottom-4 shadow-lg border-2 border-purple-500/20 bg-gradient-to-br from-background to-purple-50/30 dark:to-purple-950/10">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Primary Download Button */}
                  <Button
                    onClick={handleDownloadSelected}
                    disabled={processing}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 group"
                    size="lg"
                  >
                    {processing ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        {t('tools.split.downloading')}
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-5 w-5 group-hover:animate-bounce" />
                        {t('tools.split.downloadSelected')}
                      </>
                    )}
                  </Button>

                  {/* Email Share Button */}
                  <EmailShareButton
                    onGenerateBlob={generatePDFBlob}
                    fileName={`selected-pages-${files[0].name}`}
                    shareMessage={`I've extracted ${selectedPages.size} ${selectedPages.size === 1 ? 'page' : 'pages'} from a PDF document using Mon PDF.`}
                    disabled={processing}
                    className="sm:w-auto w-full"
                  />
                </div>

                {/* Info text */}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-purple-600 dark:text-purple-400">{selectedPages.size}</span>
                    <span>{selectedPages.size === 1 ? t('tools.split.pageSelected') : t('tools.split.pagesSelected')}</span>
                  </div>
                </div>
              </Card>
            )}

            <Card className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pageRange">{t('tools.split.orUseRange')}</Label>
                <Input
                  id="pageRange"
                  placeholder={t('tools.split.pageRangePlaceholder')}
                  value={pageRange}
                  onChange={(e) => setPageRange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{t('tools.split.pageRangeHelp')}</p>
              </div>

              <Button onClick={handleSplit} disabled={processing || !pageRange} className="w-full" size="lg">
                {processing ? (
                  t('common.processing')
                ) : (
                  <>
                    <Scissors className="mr-2 h-4 w-4" />
                    {t('tools.split.splitByRange')}
                  </>
                )}
              </Button>
            </Card>
          </>
        )}
      </CardContent>
    </Card>
  )
}
