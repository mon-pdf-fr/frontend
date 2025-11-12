'use client';

import React, { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Loader2,
  Download,
  FileImage,
  AlertCircle,
  CheckCircle,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';

import { convertPDFToImages, getPDFPageCount, isValidPDF } from '@/lib/ocr/pdf-to-image';

type ProcessingStage = 'idle' | 'uploading' | 'converting' | 'complete' | 'error';
type ImageFormat = 'png' | 'jpeg' | 'webp';

interface ProcessingProgress {
  stage: ProcessingStage;
  currentPage?: number;
  totalPages?: number;
  percentage: number;
  message: string;
}

interface ConvertedImage {
  pageNumber: number;
  dataUrl: string;
  blob: Blob;
  filename: string;
}

export function PDFToImagesTool() {
  const t = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<ProcessingProgress>({
    stage: 'idle',
    percentage: 0,
    message: '',
  });
  const [convertedImages, setConvertedImages] = useState<ConvertedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [imageFormat, setImageFormat] = useState<ImageFormat>('png');
  const [imageQuality, setImageQuality] = useState<number>(0.95);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleFileUpload(selectedFile);
    }
  };

  const handleFileUpload = async (selectedFile: File) => {
    setError(null);
    setFile(selectedFile);
    setConvertedImages([]);
    setProgress({ stage: 'uploading', percentage: 0, message: t('tools.pdfToImages.validating') });

    try {
      // Validate PDF
      const isValid = await isValidPDF(selectedFile);
      if (!isValid) {
        throw new Error(t('tools.pdfToImages.invalidPdf'));
      }

      // Check file size (max 100MB)
      if (selectedFile.size > 100 * 1024 * 1024) {
        throw new Error(t('tools.pdfToImages.fileTooLarge'));
      }

      const pageCount = await getPDFPageCount(selectedFile);

      // Warn for large PDFs
      if (pageCount > 50) {
        const confirm = window.confirm(
          t('tools.pdfToImages.largeFileWarning', { count: pageCount })
        );
        if (!confirm) {
          resetState();
          return;
        }
      }

      // Start conversion
      await convertPDF(selectedFile);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('tools.pdfToImages.processingError');
      setError(errorMessage);
      setProgress({ stage: 'error', percentage: 0, message: errorMessage });
    }
  };

  const convertPDF = async (file: File) => {
    try {
      setProgress({ stage: 'converting', percentage: 0, message: t('tools.pdfToImages.converting') });

      // Convert PDF to canvas images
      const images = await convertPDFToImages(
        file,
        (conversionProgress) => {
          setProgress({
            stage: 'converting',
            currentPage: conversionProgress.currentPage,
            totalPages: conversionProgress.totalPages,
            percentage: conversionProgress.percentage,
            message: t('tools.pdfToImages.convertingPage', {
              current: conversionProgress.currentPage,
              total: conversionProgress.totalPages,
            }),
          });
        },
        2 // Scale factor for good quality
      );

      // Convert canvases to image blobs
      const convertedImgs: ConvertedImage[] = [];
      const baseName = file.name.replace('.pdf', '');

      for (const img of images) {
        const blob = await new Promise<Blob>((resolve, reject) => {
          img.canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to convert canvas to blob'));
              }
            },
            `image/${imageFormat}`,
            imageFormat === 'jpeg' ? imageQuality : undefined
          );
        });

        const dataUrl = img.canvas.toDataURL(`image/${imageFormat}`, imageQuality);
        const filename = `${baseName}_page_${img.pageNumber}.${imageFormat}`;

        convertedImgs.push({
          pageNumber: img.pageNumber,
          dataUrl,
          blob,
          filename,
        });
      }

      setConvertedImages(convertedImgs);
      setProgress({
        stage: 'complete',
        percentage: 100,
        message: t('tools.pdfToImages.conversionComplete', { count: convertedImgs.length }),
      });

      toast.success(t('tools.pdfToImages.successTitle'), {
        description: t('tools.pdfToImages.successDescription', { count: convertedImgs.length }),
        duration: 4000,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('tools.pdfToImages.processingError');
      setError(errorMessage);
      setProgress({ stage: 'error', percentage: 0, message: errorMessage });
      throw err;
    }
  };

  const downloadImage = (image: ConvertedImage) => {
    const url = URL.createObjectURL(image.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = image.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(t('tools.pdfToImages.downloadSuccess'), {
      description: image.filename,
      duration: 2000,
    });
  };

  const downloadAllImages = async () => {
    if (convertedImages.length === 0) return;

    // For now, download images one by one
    // In a production app, you might want to create a ZIP file
    for (const image of convertedImages) {
      downloadImage(image);
      // Small delay to prevent browser from blocking downloads
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  const resetState = () => {
    setFile(null);
    setProgress({ stage: 'idle', percentage: 0, message: '' });
    setConvertedImages([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-6 w-6" />
            {t('tools.pdfToImages.title')}
          </CardTitle>
          <CardDescription>{t('tools.pdfToImages.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="format">{t('tools.pdfToImages.imageFormat')}</Label>
              <Select
                value={imageFormat}
                onValueChange={(value) => setImageFormat(value as ImageFormat)}
                disabled={progress.stage !== 'idle'}
              >
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG {t('tools.pdfToImages.formatPng')}</SelectItem>
                  <SelectItem value="jpeg">JPEG {t('tools.pdfToImages.formatJpeg')}</SelectItem>
                  <SelectItem value="webp">WebP {t('tools.pdfToImages.formatWebp')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(imageFormat === 'jpeg' || imageFormat === 'webp') && (
              <div className="space-y-2">
                <Label htmlFor="quality">
                  {t('tools.pdfToImages.quality')}: {Math.round(imageQuality * 100)}%
                </Label>
                <input
                  id="quality"
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.05"
                  value={imageQuality}
                  onChange={(e) => setImageQuality(parseFloat(e.target.value))}
                  disabled={progress.stage !== 'idle'}
                  className="w-full"
                />
              </div>
            )}
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
                <p className="text-lg font-medium mb-2">{t('tools.pdfToImages.uploadPrompt')}</p>
                <p className="text-sm text-muted-foreground">{t('tools.pdfToImages.uploadHint')}</p>
              </label>
            </div>
          )}

          {/* Progress */}
          {progress.stage !== 'idle' && progress.stage !== 'complete' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">{progress.message}</span>
              </div>
              <Progress value={progress.percentage} className="h-2" />
              {progress.currentPage && progress.totalPages && (
                <p className="text-xs text-muted-foreground">
                  {t('tools.pdfToImages.pageProgress', {
                    current: progress.currentPage,
                    total: progress.totalPages,
                  })}
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
              {t('tools.pdfToImages.convertAnother')}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Converted Images Grid */}
      {convertedImages.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('tools.pdfToImages.convertedImages')}</CardTitle>
                <CardDescription>
                  {t('tools.pdfToImages.imageCount', { count: convertedImages.length })}
                </CardDescription>
              </div>
              <Button onClick={downloadAllImages}>
                <Download className="mr-2 h-4 w-4" />
                {t('tools.pdfToImages.downloadAll')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {convertedImages.map((image) => (
                <Card key={image.pageNumber} className="overflow-hidden">
                  <div className="relative aspect-[3/4] bg-muted">
                    <img
                      src={image.dataUrl}
                      alt={`Page ${image.pageNumber}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {t('tools.pdfToImages.pageNumber', { number: image.pageNumber })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(image.blob.size)}
                        </p>
                      </div>
                      <Badge variant="outline">{imageFormat.toUpperCase()}</Badge>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => downloadImage(image)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {t('tools.pdfToImages.download')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
