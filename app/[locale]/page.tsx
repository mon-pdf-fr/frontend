"use client"

import { useState } from "react"
import { Scissors, Combine, FileImage } from "lucide-react"
import { useTranslations } from 'next-intl'
import { PDFToolCard } from "@/components/pdf-tool-card"
import { PDFSplitTool } from "@/components/pdf-split-tool"
import { PDFMergeTool } from "@/components/pdf-merge-tool"
import { ImageToPDFTool } from "@/components/image-to-pdf-tool"
import { LanguageSwitcher } from "@/components/language-switcher"
// import { AddTextTool } from "@/components/add-text-tool" // Disabled for now
import { Button } from "@/components/ui/button"
import { useAppDispatch } from "@/lib/hooks"
import { setCurrentTool, clearFiles } from "@/lib/features/pdf-slice"

type Tool = "split" | "merge" | "image-to-pdf" | null

export default function Home() {
  const [selectedTool, setSelectedTool] = useState<Tool>(null)
  const dispatch = useAppDispatch()
  const t = useTranslations()

  const handleToolSelect = (tool: Tool) => {
    setSelectedTool(tool)
    dispatch(setCurrentTool(tool))
    dispatch(clearFiles())
  }

  const handleBack = () => {
    setSelectedTool(null)
    dispatch(setCurrentTool(null))
    dispatch(clearFiles())
  }

  const tools = [
    {
      id: "split" as Tool,
      icon: Scissors,
      title: t('tools.split.title'),
      description: t('tools.split.description'),
    },
    {
      id: "merge" as Tool,
      icon: Combine,
      title: t('tools.merge.title'),
      description: t('tools.merge.description'),
    },
    {
      id: "image-to-pdf" as Tool,
      icon: FileImage,
      title: t('tools.imageToPdf.title'),
      description: t('tools.imageToPdf.description'),
    },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-30 w-30" />
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 grow-1">
        {!selectedTool ? (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-2 text-balance">{t('home.title')}</h2>
              <p className="text-muted-foreground text-balance">
                {t('home.subtitle')}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {tools.map((tool) => (
                <PDFToolCard
                  key={tool.id}
                  icon={tool.icon}
                  title={tool.title}
                  description={tool.description}
                  onClick={() => handleToolSelect(tool.id)}
                  active={selectedTool === tool.id}
                />
              ))}
            </div>
          </div>
        ) : (
          <div>
            <Button variant="ghost" onClick={handleBack} className="mb-6">
              ← {t('common.backToTools')}
            </Button>

            <div className="max-w-3xl mx-auto">
              {selectedTool === "split" && <PDFSplitTool />}
              {selectedTool === "merge" && <PDFMergeTool />}
              {selectedTool === "image-to-pdf" && <ImageToPDFTool />}
              {/* {selectedTool === "add-text" && <AddTextTool />} */}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border mt-24 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>{t('common.privacyNote')}</p>
        </div>
      </footer>
    </div>
  )
}
