'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  FileText,
  Upload,
  Loader2,
  Download,
  Table as TableIcon,
  Key,
  FileJson,
  File,
  FileType,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Copy,
  Trash2
} from 'lucide-react';

import { convertPDFToImages, getPDFPageCount, isValidPDF } from '@/lib/ocr/pdf-to-image';
import { createOCREngine, OCRPageResult } from '@/lib/ocr/ocr-engine';
import { extractAllData, ExtractedData, DetectedTable, KeyValuePair } from '@/lib/ocr/data-extraction';
import { exportData, exportTableAsCSV, exportKeyValuePairsAsJSON, copyToClipboard } from '@/lib/ocr/export-utils';
import { OCRViewer } from './ocr-viewer';

type ProcessingStage = 'idle' | 'uploading' | 'converting' | 'ocr' | 'extracting' | 'complete' | 'error';
type ExportFormat = 'csv' | 'json' | 'txt';

interface ProcessingProgress {
  stage: ProcessingStage;
  currentPage?: number;
  totalPages?: number;
  percentage: number;
  message: string;
}

export function PDFOCRTool() {
  const t = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<ProcessingProgress>({
    stage: 'idle',
    percentage: 0,
    message: '',
  });
  const [ocrResults, setOcrResults] = useState<OCRPageResult[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('eng');
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(false);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [selectedKeyValues, setSelectedKeyValues] = useState<Set<string>>(new Set());
  const [currentPageView, setCurrentPageView] = useState(0);
  const [pageCanvases, setPageCanvases] = useState<HTMLCanvasElement[]>([]);
  const [showImagePreview, setShowImagePreview] = useState(false);

  // Languages supported by Tesseract
  const languages = [
    { code: 'eng', name: 'English' },
    { code: 'fra', name: 'Français' },
    { code: 'spa', name: 'Español' },
    { code: 'deu', name: 'Deutsch' },
    { code: 'ita', name: 'Italiano' },
    { code: 'por', name: 'Português' },
    { code: 'rus', name: 'Русский' },
    { code: 'chi_sim', name: '简体中文' },
    { code: 'jpn', name: '日本語' },
    { code: 'ara', name: 'العربية' },
  ];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleFileUpload(selectedFile);
    }
  };

  const handleFileUpload = async (selectedFile: File) => {
    setError(null);
    setFile(selectedFile);
    setProgress({ stage: 'uploading', percentage: 0, message: 'Validating PDF...' });

    try {
      // Validate PDF
      const isValid = await isValidPDF(selectedFile);
      if (!isValid) {
        throw new Error('Invalid PDF file. Please upload a valid PDF.');
      }

      // Check file size (max 50MB for client-side processing)
      if (selectedFile.size > 50 * 1024 * 1024) {
        throw new Error('File too large. Please upload a PDF smaller than 50MB.');
      }

      const pageCount = await getPDFPageCount(selectedFile);

      // Warn for large PDFs
      if (pageCount > 20) {
        const confirm = window.confirm(
          `This PDF has ${pageCount} pages. Processing may take several minutes. Continue?`
        );
        if (!confirm) {
          resetState();
          return;
        }
      }

      // Start processing
      await processOCR(selectedFile);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process PDF';
      setError(errorMessage);
      setProgress({ stage: 'error', percentage: 0, message: errorMessage });
    }
  };

  const processOCR = async (file: File) => {
    try {
      // Step 1: Convert PDF to images
      setProgress({ stage: 'converting', percentage: 0, message: 'Converting PDF to images...' });

      const images = await convertPDFToImages(
        file,
        (conversionProgress) => {
          setProgress({
            stage: 'converting',
            currentPage: conversionProgress.currentPage,
            totalPages: conversionProgress.totalPages,
            percentage: conversionProgress.percentage * 0.3, // 30% of total progress
            message: `Converting page ${conversionProgress.currentPage} of ${conversionProgress.totalPages}...`,
          });
        },
        3 // Scale factor for better OCR accuracy
      );

      setPageCanvases(images.map((img) => img.canvas));

      // Step 2: Perform OCR
      setProgress({ stage: 'ocr', percentage: 30, message: 'Initializing OCR engine...' });

      const engine = await createOCREngine(selectedLanguage);

      const results = await engine.recognizeMultiple(
        images.map((img) => img.canvas),
        (pageNum, totalPages, ocrProgress) => {
          const baseProgress = 30;
          const ocrProgressRange = 60;
          const pageProgress = ((pageNum - 1) / totalPages) * ocrProgressRange;
          const currentPageProgress = (ocrProgress.progress / totalPages) * ocrProgressRange;

          setProgress({
            stage: 'ocr',
            currentPage: pageNum,
            totalPages,
            percentage: baseProgress + pageProgress + currentPageProgress,
            message: `OCR page ${pageNum} of ${totalPages} - ${ocrProgress.status}...`,
          });
        }
      );

      await engine.terminate();

      setOcrResults(results);

      // Step 3: Extract data
      setProgress({ stage: 'extracting', percentage: 90, message: 'Extracting tables and data...' });

      const data = extractAllData(results);
      setExtractedData(data);

      // Complete
      setProgress({
        stage: 'complete',
        percentage: 100,
        message: `Successfully processed ${results.length} pages!`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'OCR processing failed';
      setError(errorMessage);
      setProgress({ stage: 'error', percentage: 0, message: errorMessage });
      throw err;
    }
  };

  const handleExport = (format: ExportFormat) => {
    if (!extractedData) return;

    const selectedTablesData = Array.from(selectedTables)
      .map((id) => extractedData.tables.find((t) => t.id === id))
      .filter((t): t is DetectedTable => t !== undefined);

    const selectedKeyValuesData = Array.from(selectedKeyValues)
      .map((id) => extractedData.keyValuePairs.find((kv) => kv.id === id))
      .filter((kv): kv is KeyValuePair => kv !== undefined);

    const dataToExport: ExtractedData = {
      tables: selectedTablesData.length > 0 ? selectedTablesData : extractedData.tables,
      keyValuePairs:
        selectedKeyValuesData.length > 0 ? selectedKeyValuesData : extractedData.keyValuePairs,
      allText: extractedData.allText,
      pageTexts: extractedData.pageTexts,
    };

    exportData(dataToExport, {
      format,
      includeTables: true,
      includeKeyValuePairs: true,
      includeAllText: true,
      fileName: file?.name.replace('.pdf', '') || 'ocr-result',
    });
  };

  const handleCopyToClipboard = async () => {
    if (!extractedData) return;

    try {
      await copyToClipboard(extractedData, 'text');
      toast.success(t('tools.ocr.copySuccess'), {
        description: t('tools.ocr.copySuccessDescription'),
        duration: 3000,
      });
    } catch (err) {
      toast.error(t('tools.ocr.copyError'), {
        description: t('tools.ocr.copyErrorDescription'),
        duration: 4000,
      });
    }
  };

  const resetState = () => {
    setFile(null);
    setProgress({ stage: 'idle', percentage: 0, message: '' });
    setOcrResults([]);
    setExtractedData(null);
    setError(null);
    setSelectedTables(new Set());
    setSelectedKeyValues(new Set());
    setCurrentPageView(0);
    setPageCanvases([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleTableSelection = (tableId: string) => {
    setSelectedTables((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tableId)) {
        newSet.delete(tableId);
      } else {
        newSet.add(tableId);
      }
      return newSet;
    });
  };

  const toggleKeyValueSelection = (kvId: string) => {
    setSelectedKeyValues((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(kvId)) {
        newSet.delete(kvId);
      } else {
        newSet.add(kvId);
      }
      return newSet;
    });
  };

  const selectAllTables = () => {
    if (extractedData) {
      setSelectedTables(new Set(extractedData.tables.map((t) => t.id)));
    }
  };

  const deselectAllTables = () => {
    setSelectedTables(new Set());
  };

  const selectAllKeyValues = () => {
    if (extractedData) {
      setSelectedKeyValues(new Set(extractedData.keyValuePairs.map((kv) => kv.id)));
    }
  };

  const deselectAllKeyValues = () => {
    setSelectedKeyValues(new Set());
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            {t('tools.ocr.title')}
          </CardTitle>
          <CardDescription>{t('tools.ocr.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Language Selection */}
          <div className="flex items-center gap-4">
            <Label htmlFor="language">{t('tools.ocr.selectLanguage')}</Label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage} disabled={progress.stage !== 'idle'}>
              <SelectTrigger id="language" className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Upload */}
          {progress.stage === 'idle' && (
            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="pdf-upload"
              />
              <label htmlFor="pdf-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">{t('tools.ocr.uploadPrompt')}</p>
                <p className="text-sm text-muted-foreground">{t('tools.ocr.uploadHint')}</p>
              </label>
            </div>
          )}

          {/* Progress */}
          {progress.stage !== 'idle' && progress.stage !== 'complete' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm font-medium">{progress.message}</span>
                </div>
                {pageCanvases.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowImagePreview(true)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Images
                  </Button>
                )}
              </div>
              <Progress value={progress.percentage} className="h-2" />
              {progress.currentPage && progress.totalPages && (
                <p className="text-xs text-muted-foreground">
                  Page {progress.currentPage} of {progress.totalPages}
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success */}
          {progress.stage === 'complete' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{progress.message}</AlertDescription>
            </Alert>
          )}

          {/* Reset Button */}
          {(progress.stage === 'complete' || progress.stage === 'error') && (
            <Button onClick={resetState} variant="outline" className="w-full">
              <Trash2 className="mr-2 h-4 w-4" />
              {t('tools.ocr.processAnother')}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {extractedData && progress.stage === 'complete' && (
        <Tabs defaultValue="text" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="text">
              <FileText className="mr-2 h-4 w-4" />
              {t('tools.ocr.tabs.text')}
            </TabsTrigger>
            <TabsTrigger value="tables">
              <TableIcon className="mr-2 h-4 w-4" />
              {t('tools.ocr.tabs.tables')} ({extractedData.tables.length})
            </TabsTrigger>
            <TabsTrigger value="keyvalues">
              <Key className="mr-2 h-4 w-4" />
              {t('tools.ocr.tabs.keyValues')} ({extractedData.keyValuePairs.length})
            </TabsTrigger>
            {/*<TabsTrigger value="preview">*/}
            {/*  <Eye className="mr-2 h-4 w-4" />*/}
            {/*  {t('tools.ocr.tabs.preview')}*/}
            {/*</TabsTrigger>*/}
          </TabsList>

          {/* Full Text Tab */}
          <TabsContent value="text">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t('tools.ocr.extractedText')}</span>
                  <Button size="sm" variant="outline" onClick={handleCopyToClipboard}>
                    <Copy className="mr-2 h-4 w-4" />
                    {t('tools.ocr.copy')}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono">{extractedData.allText}</pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tables Tab */}
          <TabsContent value="tables">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t('tools.ocr.detectedTables')}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={selectAllTables}>
                      {t('tools.ocr.selectAll')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={deselectAllTables}>
                      {t('tools.ocr.deselectAll')}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {extractedData.tables.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {t('tools.ocr.noTablesDetected')}
                  </p>
                ) : (
                  extractedData.tables.map((table) => (
                    <Card key={table.id} className={selectedTables.has(table.id) ? 'ring-2 ring-primary' : ''}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedTables.has(table.id)}
                              onCheckedChange={() => toggleTableSelection(table.id)}
                            />
                            <div>
                              <CardTitle className="text-base">
                                Table on Page {table.pageNumber}
                              </CardTitle>
                              <CardDescription>
                                {table.rowCount} rows × {table.columnCount} columns
                              </CardDescription>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => exportTableAsCSV(table)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            CSV
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-border">
                            <tbody>
                              {table.rows.map((row) => (
                                <tr key={row.rowIndex}>
                                  {row.cells.map((cell, idx) => (
                                    <td
                                      key={idx}
                                      className="border border-border px-3 py-2 text-sm"
                                    >
                                      {cell.text}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Key-Value Pairs Tab */}
          <TabsContent value="keyvalues">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t('tools.ocr.detectedKeyValues')}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={selectAllKeyValues}>
                      {t('tools.ocr.selectAll')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={deselectAllKeyValues}>
                      {t('tools.ocr.deselectAll')}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {extractedData.keyValuePairs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {t('tools.ocr.noKeyValuesDetected')}
                  </p>
                ) : (
                  extractedData.keyValuePairs.map((pair) => (
                    <div
                      key={pair.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        selectedKeyValues.has(pair.id) ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <Checkbox
                        checked={selectedKeyValues.has(pair.id)}
                        onCheckedChange={() => toggleKeyValueSelection(pair.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{pair.key}:</span> {pair.value}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Page {pair.pageNumber} • Confidence: {Math.round(pair.confidence)}%
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview Tab */}
          {/*<TabsContent value="preview">*/}
          {/*  <Card>*/}
          {/*    <CardHeader>*/}
          {/*      <CardTitle className="flex items-center justify-between">*/}
          {/*        <span>{t('tools.ocr.preview')}</span>*/}
          {/*        <div className="flex items-center gap-2">*/}
          {/*          <Button*/}
          {/*            size="sm"*/}
          {/*            variant="outline"*/}
          {/*            onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}*/}
          {/*          >*/}
          {/*            {showBoundingBoxes ? (*/}
          {/*              <>*/}
          {/*                <EyeOff className="mr-2 h-4 w-4" />*/}
          {/*                {t('tools.ocr.hideBoundingBoxes')}*/}
          {/*              </>*/}
          {/*            ) : (*/}
          {/*              <>*/}
          {/*                <Eye className="mr-2 h-4 w-4" />*/}
          {/*                {t('tools.ocr.showBoundingBoxes')}*/}
          {/*              </>*/}
          {/*            )}*/}
          {/*          </Button>*/}
          {/*        </div>*/}
          {/*      </CardTitle>*/}
          {/*    </CardHeader>*/}
          {/*    <CardContent className="space-y-4">*/}
          {/*      /!* Page Navigation *!/*/}
          {/*      {ocrResults.length > 1 && (*/}
          {/*        <div className="flex items-center justify-center gap-4">*/}
          {/*          <Button*/}
          {/*            variant="outline"*/}
          {/*            size="sm"*/}
          {/*            disabled={currentPageView === 0}*/}
          {/*            onClick={() => setCurrentPageView((p) => p - 1)}*/}
          {/*          >*/}
          {/*            Previous*/}
          {/*          </Button>*/}
          {/*          <span className="text-sm">*/}
          {/*            Page {currentPageView + 1} of {ocrResults.length}*/}
          {/*          </span>*/}
          {/*          <Button*/}
          {/*            variant="outline"*/}
          {/*            size="sm"*/}
          {/*            disabled={currentPageView === ocrResults.length - 1}*/}
          {/*            onClick={() => setCurrentPageView((p) => p + 1)}*/}
          {/*          >*/}
          {/*            Next*/}
          {/*          </Button>*/}
          {/*        </div>*/}
          {/*      )}*/}

          {/*      /!* OCR Viewer *!/*/}
          {/*      {pageCanvases[currentPageView] && ocrResults[currentPageView] && (*/}
          {/*        <div className="overflow-auto max-h-[600px] border border-border rounded-lg">*/}
          {/*          <OCRViewer*/}
          {/*            canvas={pageCanvases[currentPageView]}*/}
          {/*            words={ocrResults[currentPageView].words}*/}
          {/*            lines={ocrResults[currentPageView].lines}*/}
          {/*            showBoundingBoxes={showBoundingBoxes}*/}
          {/*          />*/}
          {/*        </div>*/}
          {/*      )}*/}
          {/*    </CardContent>*/}
          {/*  </Card>*/}
          {/*</TabsContent>*/}
        </Tabs>
      )}

      {/* Export Panel */}
      {extractedData && progress.stage === 'complete' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('tools.ocr.export')}</CardTitle>
            <CardDescription>{t('tools.ocr.exportDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              <Button onClick={() => handleExport('csv')}>
                <File className="mr-2 h-4 w-4" />
                {t('tools.ocr.exportCSV')}
              </Button>
              <Button onClick={() => handleExport('json')}>
                <FileJson className="mr-2 h-4 w-4" />
                {t('tools.ocr.exportJSON')}
              </Button>
              <Button onClick={() => handleExport('txt')}>
                <FileType className="mr-2 h-4 w-4" />
                {t('tools.ocr.exportTXT')}
              </Button>
            </div>
            {(selectedTables.size > 0 || selectedKeyValues.size > 0) && (
              <p className="text-sm text-muted-foreground mt-3">
                {t('tools.ocr.selectedItemsNote')}: {selectedTables.size} tables, {selectedKeyValues.size} key-value pairs
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Image Preview Dialog */}
      <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>PDF Pages Converted to Images</DialogTitle>
            <DialogDescription>
              These are the images being sent to OCR for text extraction
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {pageCanvases.map((canvas, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Page {index + 1}</h3>
                  <Badge variant="outline">
                    {canvas.width} × {canvas.height}
                  </Badge>
                </div>
                <div className="border border-border rounded-lg p-4 bg-muted/50 overflow-auto">
                  <img
                    src={canvas.toDataURL('image/png')}
                    alt={`Page ${index + 1}`}
                    className="max-w-full h-auto mx-auto"
                    style={{ maxHeight: '600px' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
