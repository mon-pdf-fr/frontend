"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface PDFToolCardProps {
  icon: LucideIcon
  title: string
  description: string
  onClick: () => void
  active?: boolean
}

export function PDFToolCard({ icon: Icon, title, description, onClick, active }: PDFToolCardProps) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all hover:shadow-lg border-2",
        active ? "border-foreground bg-accent" : "border-border hover:border-foreground/50",
      )}
      onClick={onClick}
    >
      <div className="p-6">
        <div
          className={cn(
            "mb-4 inline-flex p-3 rounded-xl transition-colors",
            active ? "bg-foreground text-background" : "bg-muted group-hover:bg-foreground group-hover:text-background",
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold mb-2 text-balance">{title}</h3>
        <p className="text-sm text-muted-foreground text-balance">{description}</p>
      </div>
    </Card>
  )
}
