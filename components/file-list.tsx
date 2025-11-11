"use client"

import { File, X, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { PDFFile } from "@/lib/features/pdf-slice"

interface FileListProps {
  files: PDFFile[]
  selectedFiles: string[]
  onRemove: (id: string) => void
  onToggleSelect: (id: string) => void
  selectable?: boolean
}

export function FileList({ files, selectedFiles, onRemove, onToggleSelect, selectable = false }: FileListProps) {
  if (files.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Uploaded Files ({files.length})</h3>
      {files.map((file) => {
        const isSelected = selectedFiles.includes(file.id)
        return (
          <Card
            key={file.id}
            className={cn(
              "p-4 flex items-center justify-between transition-all",
              selectable && "cursor-pointer hover:bg-accent",
              isSelected && "border-foreground bg-accent",
            )}
            onClick={() => selectable && onToggleSelect(file.id)}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {selectable && (
                <div
                  className={cn(
                    "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                    isSelected ? "bg-foreground border-foreground" : "border-border",
                  )}
                >
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-background" />}
                </div>
              )}
              <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{file.name}</p>
                {file.pages && <p className="text-xs text-muted-foreground">{file.pages} pages</p>}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(file.id)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </Card>
        )
      })}
    </div>
  )
}
