import Tesseract, { createWorker, Worker, PSM } from 'tesseract.js';

export interface OCRProgress {
  status: string;
  progress: number;
}

export interface OCRWord {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  baseline: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export interface OCRLine {
  text: string;
  confidence: number;
  words: OCRWord[];
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export interface OCRResult {
  text: string;
  confidence: number;
  lines: OCRLine[];
  words: OCRWord[];
  data: Tesseract.Page;
}

export interface OCRPageResult {
  pageNumber: number;
  text: string;
  confidence: number;
  lines: OCRLine[];
  words: OCRWord[];
}

/**
 * OCR Engine class for managing Tesseract workers
 */
export class OCREngine {
  private worker: Worker | null = null;
  private isInitialized = false;

  /**
   * Initialize the OCR engine
   * @param language - Language to use (default: 'eng')
   */
  async initialize(language: string = 'eng'): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.worker = await createWorker(language, undefined, {
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
        langPath: 'https://tessdata.projectnaptha.com/4.0.0',
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js',
        logger: (m: any) => {
          console.log('Tesseract Logger:', m);
        },
      });

      // Set parameters for better OCR accuracy and detail extraction
      await this.worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        preserve_interword_spaces: '1',
        tessedit_char_whitelist: '',
      });

      this.isInitialized = true;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to initialize OCR engine: ${error.message}`);
      }
      throw new Error('Failed to initialize OCR engine: Unknown error');
    }
  }

  /**
   * Perform OCR on an image
   * @param image - Canvas, Image, or ImageData
   * @param onProgress - Optional progress callback
   * @returns OCR result
   */
  async recognize(
    image: HTMLCanvasElement | HTMLImageElement | ImageData,
    onProgress?: (progress: OCRProgress) => void
  ): Promise<OCRResult> {
    if (!this.worker || !this.isInitialized) {
      throw new Error('OCR engine not initialized');
    }

    try {
      // Convert image to canvas if needed, then to data URL for worker compatibility
      let canvas: HTMLCanvasElement;

      if (image instanceof HTMLCanvasElement) {
        canvas = image;
      } else if (image instanceof HTMLImageElement) {
        // Convert image element to canvas
        canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }
        ctx.drawImage(image, 0, 0);
      } else if (image instanceof ImageData) {
        // Convert ImageData to canvas
        canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }
        ctx.putImageData(image, 0, 0);
      } else {
        throw new Error('Unsupported image type');
      }

      // Convert canvas to blob for better worker compatibility
      const imageBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        }, 'image/png');
      });

      const result = await this.worker.recognize(imageBlob as any);

      // Log the full result structure for debugging
      console.log('Tesseract full result:', result);
      console.log('Tesseract data:', result.data);

      // Handle different Tesseract output structures
      const resultData = result.data as any;

      // Try to get lines - check multiple possible paths
      const linesData = resultData.lines || resultData.paragraphs?.[0]?.lines || [];
      const wordsData = resultData.words || [];

      console.log('Lines data:', linesData);
      console.log('Words data:', wordsData);

      const lines: OCRLine[] = linesData.map((line: any) => ({
        text: line.text || '',
        confidence: line.confidence || 0,
        words: (line.words || []).map((word: any) => ({
          text: word.text || '',
          confidence: word.confidence || 0,
          bbox: word.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
          baseline: word.baseline || { x0: 0, y0: 0, x1: 0, y1: 0 },
        })),
        bbox: line.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
      }));

      const words: OCRWord[] = wordsData.map((word: any) => ({
        text: word.text || '',
        confidence: word.confidence || 0,
        bbox: word.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
        baseline: word.baseline || { x0: 0, y0: 0, x1: 0, y1: 0 },
      }));

      // If no detailed data, parse from text
      if (lines.length === 0 && resultData.text) {
        const textLines = resultData.text.split('\n');
        textLines.forEach((lineText: string, index: number) => {
          lines.push({
            text: lineText,
            confidence: resultData.confidence || 0,
            words: [],
            bbox: { x0: 0, y0: index * 20, x1: 100, y1: (index + 1) * 20 },
          });
        });
      }

      return {
        text: resultData.text || '',
        confidence: resultData.confidence || 0,
        lines,
        words,
        data: resultData,
      };
    } catch (error) {
      console.log(error)
      if (error instanceof Error) {
        throw new Error(`OCR recognition failed: ${error.message}`);
      }
      throw new Error('OCR recognition failed: Unknown error');
    }
  }

  /**
   * Perform OCR on multiple images (pages)
   * @param images - Array of canvases
   * @param onProgress - Optional progress callback
   * @returns Array of OCR page results
   */
  async recognizeMultiple(
    images: HTMLCanvasElement[],
    onProgress?: (pageNumber: number, totalPages: number, ocrProgress: OCRProgress) => void
  ): Promise<OCRPageResult[]> {
    const results: OCRPageResult[] = [];

    for (let i = 0; i < images.length; i++) {
      const result = await this.recognize(images[i], (progress) => {
        if (onProgress) {
          onProgress(i + 1, images.length, progress);
        }
      });

      results.push({
        pageNumber: i + 1,
        text: result.text,
        confidence: result.confidence,
        lines: result.lines,
        words: result.words,
      });
    }

    return results;
  }

  /**
   * Change the OCR language
   * @param language - Language code (e.g., 'eng', 'fra', 'spa')
   */
  async changeLanguage(language: string): Promise<void> {
    if (!this.worker) {
      throw new Error('OCR engine not initialized');
    }

    try {
      await this.worker.loadLanguage(language);
      await this.worker.initialize(language);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to change language: ${error.message}`);
      }
      throw new Error('Failed to change language: Unknown error');
    }
  }

  /**
   * Terminate the OCR worker
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }

  /**
   * Check if the engine is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

/**
 * Create a new OCR engine instance
 * @param language - Language to use (default: 'eng')
 * @returns Initialized OCR engine
 */
export async function createOCREngine(language: string = 'eng'): Promise<OCREngine> {
  const engine = new OCREngine();
  await engine.initialize(language);
  return engine;
}
