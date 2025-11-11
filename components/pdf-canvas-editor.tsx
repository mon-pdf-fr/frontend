"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Trash2, Plus, Type, RotateCw } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TextElement {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  color: string
  rotation: number
  isDragging?: boolean
  fontFamily?: string
  fontWeight?: string
}

interface PDFCanvasEditorProps {
  file: File
  onTextElementsChange: (elements: TextElement[]) => void
}

export function PDFCanvasEditor({ file, onTextElementsChange }: PDFCanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [pdfImage, setPdfImage] = useState<HTMLImageElement | null>(null)
  const [textElements, setTextElements] = useState<TextElement[]>([])
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [draggedElement, setDraggedElement] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [pageImages, setPageImages] = useState<Map<number, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [isRotating, setIsRotating] = useState(false)
  const [rotationStart, setRotationStart] = useState({ x: 0, y: 0, rotation: 0 })
  const [history, setHistory] = useState<TextElement[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Load all PDF pages
  useEffect(() => {
    let isMounted = true

    const loadAllPages = async () => {
      setLoading(true)
      setPageImages(new Map())

      try {
        const pdfjsLib = await import("pdfjs-dist")
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

        const arrayBuffer = await file.arrayBuffer()
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
        const pdf = await loadingTask.promise

        if (!isMounted) return

        setTotalPages(pdf.numPages)

        const containerWidth = containerRef.current?.clientWidth || 800

        // Render all pages
        for (let i = 1; i <= pdf.numPages; i++) {
          if (!isMounted) break

          try {
            const page = await pdf.getPage(i)
            const viewport = page.getViewport({ scale: 1.5 })

            const newScale = Math.min(containerWidth / viewport.width, 1)
            const scaledViewport = page.getViewport({ scale: 1.5 * newScale })

            if (i === 1) {
              setScale(newScale)
              setCanvasSize({ width: scaledViewport.width, height: scaledViewport.height })
            }

            const canvas = document.createElement("canvas")
            canvas.width = scaledViewport.width
            canvas.height = scaledViewport.height
            const context = canvas.getContext("2d")

            if (!context) continue

            await page.render({
              canvasContext: context,
              viewport: scaledViewport,
              canvas: canvas,
            }).promise

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
          const containerWidth = containerRef.current?.clientWidth || 800
          setCanvasSize({ width: containerWidth, height: containerWidth * 1.414 })
          setLoading(false)
        }
      }
    }

    loadAllPages()

    return () => {
      isMounted = false
    }
  }, [file])

  // Load current page image
  useEffect(() => {
    const imageUrl = pageImages.get(currentPage + 1)
    if (imageUrl) {
      const img = new Image()
      img.src = imageUrl
      img.onload = () => {
        setPdfImage(img)
      }
    }
  }, [currentPage, pageImages])

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (pdfImage) {
      ctx.drawImage(pdfImage, 0, 0, canvas.width, canvas.height)
    } else {
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    ctx.strokeStyle = "rgba(0, 0, 0, 0.05)"
    ctx.lineWidth = 1
    for (let i = 0; i < canvas.width; i += 50) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, canvas.height)
      ctx.stroke()
    }
    for (let i = 0; i < canvas.height; i += 50) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(canvas.width, i)
      ctx.stroke()
    }

    textElements.forEach((element) => {
      ctx.save()

      ctx.translate(element.x, element.y)
      ctx.rotate((element.rotation * Math.PI) / 180)

      const fontWeight = element.fontWeight || "normal"
      const fontFamily = element.fontFamily || "Arial"
      ctx.font = `${fontWeight} ${element.fontSize}px ${fontFamily}`
      ctx.fillStyle = element.color
      ctx.fillText(element.text, 0, 0)

      if (element.id === selectedElement) {
        const metrics = ctx.measureText(element.text)
        const padding = 8
        const boxWidth = metrics.width + padding * 2
        const boxHeight = element.fontSize + padding * 2

        // Selection box
        ctx.strokeStyle = "#3b82f6"
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.strokeRect(-padding, -element.fontSize - padding, boxWidth, boxHeight)
        ctx.setLineDash([])

        // Corner resize handles
        ctx.fillStyle = "#3b82f6"
        const handleSize = 8

        // Top-left
        ctx.fillRect(-padding - handleSize/2, -element.fontSize - padding - handleSize/2, handleSize, handleSize)
        // Top-right
        ctx.fillRect(metrics.width + padding - handleSize/2, -element.fontSize - padding - handleSize/2, handleSize, handleSize)
        // Bottom-left
        ctx.fillRect(-padding - handleSize/2, padding - handleSize/2, handleSize, handleSize)
        // Bottom-right
        ctx.fillRect(metrics.width + padding - handleSize/2, padding - handleSize/2, handleSize, handleSize)

        // Rotation handle
        ctx.strokeStyle = "#3b82f6"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(metrics.width / 2, -element.fontSize - padding)
        ctx.lineTo(metrics.width / 2, -element.fontSize - padding - 20)
        ctx.stroke()

        ctx.fillStyle = "#10b981"
        ctx.beginPath()
        ctx.arc(metrics.width / 2, -element.fontSize - padding - 20, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 2
        ctx.stroke()
      }

      ctx.restore()
    })

    onTextElementsChange(textElements)
  }, [textElements, selectedElement, pdfImage, canvasSize])

  const addTextElement = () => {
    const centerX = canvasSize.width / 2
    const centerY = canvasSize.height / 2

    const newElement: TextElement = {
      id: Math.random().toString(36).substr(2, 9),
      text: "Double click to edit",
      x: centerX,
      y: centerY,
      fontSize: 20,
      color: "#000000",
      rotation: 0,
      fontFamily: "Arial",
      fontWeight: "normal",
    }
    const newElements = [...textElements, newElement]
    setTextElements(newElements)
    setSelectedElement(newElement.id)
    saveToHistory(newElements)
  }

  const saveToHistory = (elements: TextElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(JSON.parse(JSON.stringify(elements)))
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setTextElements(JSON.parse(JSON.stringify(history[historyIndex - 1])))
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setTextElements(JSON.parse(JSON.stringify(history[historyIndex + 1])))
    }
  }

  const updateTextElement = (id: string, updates: Partial<TextElement>) => {
    setTextElements(textElements.map((el) => (el.id === id ? { ...el, ...updates } : el)))
  }

  const deleteTextElement = (id: string) => {
    setTextElements(textElements.filter((el) => el.id !== id))
    if (selectedElement === id) {
      setSelectedElement(null)
    }
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    let clickedElement: string | null = null
    for (let i = textElements.length - 1; i >= 0; i--) {
      const element = textElements[i]
      ctx.font = `${element.fontWeight || "normal"} ${element.fontSize}px ${element.fontFamily || "Arial"}`
      const metrics = ctx.measureText(element.text)

      const dx = x - element.x
      const dy = y - element.y
      const angle = (-element.rotation * Math.PI) / 180
      const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle)
      const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle)

      const padding = 8
      if (rotatedX >= -padding && rotatedX <= metrics.width + padding &&
          rotatedY >= -element.fontSize - padding && rotatedY <= padding) {
        clickedElement = element.id
        break
      }
    }

    setSelectedElement(clickedElement)
  }

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedElement) return

    const element = textElements.find((el) => el.id === selectedElement)
    if (!element) return

    const newText = prompt("Edit text:", element.text)
    if (newText !== null && newText !== element.text) {
      updateTextElement(selectedElement, { text: newText })
      saveToHistory(textElements.map((el) =>
        el.id === selectedElement ? { ...el, text: newText } : el
      ))
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !selectedElement) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const element = textElements.find((el) => el.id === selectedElement)
    if (!element) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    // Calculate rotation handle position
    ctx.font = `${element.fontWeight || "normal"} ${element.fontSize}px ${element.fontFamily || "Arial"}`
    const metrics = ctx.measureText(element.text)
    const padding = 8

    // Transform mouse coordinates to element's local space
    const dx = x - element.x
    const dy = y - element.y
    const angle = (-element.rotation * Math.PI) / 180
    const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle)
    const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle)

    // Check if clicking on rotation handle
    const rotHandleX = metrics.width / 2
    const rotHandleY = -element.fontSize - padding - 20
    const distToRotHandle = Math.sqrt(Math.pow(rotatedX - rotHandleX, 2) + Math.pow(rotatedY - rotHandleY, 2))

    if (distToRotHandle < 10) {
      setIsRotating(true)
      setRotationStart({ x, y, rotation: element.rotation })
    } else {
      setDraggedElement(selectedElement)
      setDragOffset({ x: x - element.x, y: y - element.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (isRotating && selectedElement) {
      const element = textElements.find((el) => el.id === selectedElement)
      if (!element) return

      // Set rotation cursor
      canvasRef.current.style.cursor = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'black\' stroke-width=\'2\'><path d=\'M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2\'/></svg>") 12 12, auto'

      // Calculate angle from element center to mouse
      const dx = x - element.x
      const dy = y - element.y
      const angleRad = Math.atan2(dy, dx)
      const angleDeg = (angleRad * 180 / Math.PI) + 90 // Add 90 to align with visual

      updateTextElement(selectedElement, {
        rotation: Math.round(angleDeg)
      })
    } else if (draggedElement) {
      updateTextElement(draggedElement, {
        x: x - dragOffset.x,
        y: y - dragOffset.y,
      })
    }

    // Change cursor based on hover state
    if (canvasRef.current && selectedElement && !draggedElement && !isRotating) {
      const element = textElements.find((el) => el.id === selectedElement)
      if (element) {
        const ctx = canvasRef.current.getContext("2d")
        if (ctx) {
          ctx.font = `${element.fontWeight || "normal"} ${element.fontSize}px ${element.fontFamily || "Arial"}`
          const metrics = ctx.measureText(element.text)
          const padding = 8

          const dx = x - element.x
          const dy = y - element.y
          const angle = (-element.rotation * Math.PI) / 180
          const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle)
          const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle)

          const rotHandleX = metrics.width / 2
          const rotHandleY = -element.fontSize - padding - 20
          const distToRotHandle = Math.sqrt(Math.pow(rotatedX - rotHandleX, 2) + Math.pow(rotatedY - rotHandleY, 2))

          if (distToRotHandle < 10) {
            canvasRef.current.style.cursor = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'black\' stroke-width=\'2\'><path d=\'M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2\'/></svg>") 12 12, auto'
          } else {
            canvasRef.current.style.cursor = 'move'
          }
        }
      }
    }
  }

  const handleMouseUp = () => {
    if (draggedElement || isRotating) {
      saveToHistory(textElements)
    }
    setDraggedElement(null)
    setIsRotating(false)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
      // Delete
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElement) {
        e.preventDefault()
        deleteTextElement(selectedElement)
      }
      // Duplicate
      else if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedElement) {
        e.preventDefault()
        const element = textElements.find((el) => el.id === selectedElement)
        if (element) {
          const newElement = {
            ...element,
            id: Math.random().toString(36).substr(2, 9),
            x: element.x + 20,
            y: element.y + 20,
          }
          const newElements = [...textElements, newElement]
          setTextElements(newElements)
          setSelectedElement(newElement.id)
          saveToHistory(newElements)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedElement, textElements, historyIndex, history])

  const selectedElementData = textElements.find((el) => el.id === selectedElement)

  if (loading && totalPages === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading PDF pages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold">PDF Canvas Editor</h3>
        <div className="flex items-center gap-2">
          <Button onClick={undo} disabled={historyIndex <= 0} variant="outline" size="sm" title="Undo (Ctrl+Z)">
            <RotateCw className="h-4 w-4 rotate-180" />
          </Button>
          <Button onClick={redo} disabled={historyIndex >= history.length - 1} variant="outline" size="sm" title="Redo (Ctrl+Y)">
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button onClick={addTextElement} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Text
          </Button>
        </div>
      </div>

      {totalPages > 1 && (
        <Card className="p-4">
          <h4 className="text-sm font-semibold mb-3">Select Page to Edit</h4>
          <div className="text-xs text-muted-foreground mb-3">
            Loaded {pageImages.size} of {totalPages} pages
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {Array.from({ length: totalPages }, (_, index) => {
              const pageNumber = index + 1
              const isSelected = currentPage === index
              const imageUrl = pageImages.get(pageNumber)

              return (
                <Card
                  key={pageNumber}
                  className={cn(
                    "relative overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]",
                    isSelected && "ring-2 ring-primary shadow-xl bg-primary/5"
                  )}
                  onClick={() => setCurrentPage(index)}
                >
                  <div className="aspect-[1/1.414] bg-muted flex items-center justify-center p-2">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={`Page ${pageNumber}`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground gap-1">
                        <div className="text-xs animate-pulse">Loading...</div>
                      </div>
                    )}
                  </div>

                  <div className="p-2 text-center bg-background/95 backdrop-blur border-t">
                    <p className="text-xs font-medium">Page {pageNumber}</p>
                  </div>
                </Card>
              )
            })}
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Card ref={containerRef} className="md:col-span-2 p-4 bg-muted/30">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="border border-border rounded-lg cursor-crosshair bg-white"
            onClick={handleCanvasClick}
            onDoubleClick={handleCanvasDoubleClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-1">
            <p className="text-xs font-medium">Quick Tips:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Click text to select, drag to move</li>
              <li>• Drag green handle to rotate</li>
              <li>• Ctrl+Z: Undo | Ctrl+Y: Redo</li>
              <li>• Ctrl+D: Duplicate | Del: Delete</li>
            </ul>
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            <h4 className="font-semibold">Text Properties</h4>
          </div>

          {selectedElementData ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="text-content">Text</Label>
                <Input
                  id="text-content"
                  value={selectedElementData.text}
                  onChange={(e) => updateTextElement(selectedElementData.id, { text: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="font-family">Font</Label>
                  <select
                    id="font-family"
                    value={selectedElementData.fontFamily || "Arial"}
                    onChange={(e) => updateTextElement(selectedElementData.id, { fontFamily: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Comic Sans MS">Comic Sans MS</option>
                    <option value="Impact">Impact</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="font-weight">Weight</Label>
                  <select
                    id="font-weight"
                    value={selectedElementData.fontWeight || "normal"}
                    onChange={(e) => updateTextElement(selectedElementData.id, { fontWeight: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="font-size">Font Size</Label>
                <Input
                  id="font-size"
                  type="number"
                  value={selectedElementData.fontSize}
                  onChange={(e) =>
                    updateTextElement(selectedElementData.id, {
                      fontSize: Number(e.target.value),
                    })
                  }
                  min={8}
                  max={120}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="text-color">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="text-color"
                    type="color"
                    value={selectedElementData.color}
                    onChange={(e) => updateTextElement(selectedElementData.id, { color: e.target.value })}
                    className="h-10 w-20"
                  />
                  <Input
                    value={selectedElementData.color}
                    onChange={(e) => updateTextElement(selectedElementData.id, { color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rotation">Rotation (degrees)</Label>
                <div className="flex gap-2">
                  <Input
                    id="rotation"
                    type="number"
                    value={selectedElementData.rotation}
                    onChange={(e) => updateTextElement(selectedElementData.id, { rotation: Number(e.target.value) })}
                    min={-180}
                    max={180}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      updateTextElement(selectedElementData.id, {
                        rotation: (selectedElementData.rotation + 45) % 360,
                      })
                    }
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="x-pos">X Position</Label>
                  <Input
                    id="x-pos"
                    type="number"
                    value={Math.round(selectedElementData.x)}
                    onChange={(e) => updateTextElement(selectedElementData.id, { x: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="y-pos">Y Position</Label>
                  <Input
                    id="y-pos"
                    type="number"
                    value={Math.round(selectedElementData.y)}
                    onChange={(e) => updateTextElement(selectedElementData.id, { y: Number(e.target.value) })}
                  />
                </div>
              </div>

              <Button
                variant="destructive"
                className="w-full"
                onClick={() => deleteTextElement(selectedElementData.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Text
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Type className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a text element to edit its properties</p>
            </div>
          )}

          {textElements.length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <Label>All Text Elements ({textElements.length})</Label>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {textElements.map((element) => (
                  <button
                    key={element.id}
                    onClick={() => setSelectedElement(element.id)}
                    className={`w-full text-left p-2 rounded text-sm transition-colors ${
                      selectedElement === element.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {element.text}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
