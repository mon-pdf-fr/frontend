import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker
if (typeof window !== 'undefined') {
  // Use a stable CDN URL that works with the installed version
  pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`
}

export interface PDFPageImage {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export interface PDFConversionProgress {
  currentPage: number;
  totalPages: number;
  percentage: number;
}

/**
 * Convert a PDF file to an array of canvas elements (images)
 * @param file - The PDF file to convert
 * @param onProgress - Optional callback for progress updates
 * @param scale - Scale factor for rendering (default: 2 for better OCR accuracy)
 * @returns Array of PDFPageImage objects
 */
export async function convertPDFToImages(
  file: File,
  onProgress?: (progress: PDFConversionProgress) => void,
  scale: number = 2
): Promise<PDFPageImage[]> {
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const totalPages = pdf.numPages;
    const images: PDFPageImage[] = [];

    // Process each page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 3 });

      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Render PDF page to canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      } as any;

      await page.render(renderContext).promise;

      images.push({
        pageNumber: pageNum,
        canvas,
        width: viewport.width,
        height: viewport.height,
      });

      // Report progress
      if (onProgress) {
        onProgress({
          currentPage: pageNum,
          totalPages,
          percentage: (pageNum / totalPages) * 100,
        });
      }
    }

    return images;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to convert PDF to images: ${error.message}`);
    }
    throw new Error('Failed to convert PDF to images: Unknown error');
  }
}

/**
 * Convert a single PDF page to an image
 * @param file - The PDF file
 * @param pageNumber - The page number to convert (1-indexed)
 * @param scale - Scale factor for rendering
 * @returns PDFPageImage object
 */
export async function convertPDFPageToImage(
  file: File,
  pageNumber: number,
  scale: number = 2
): Promise<PDFPageImage> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      throw new Error(`Invalid page number: ${pageNumber}`);
    }

    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Failed to get canvas context');
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    } as any;

    await page.render(renderContext).promise;

    return {
      pageNumber,
      canvas,
      width: viewport.width,
      height: viewport.height,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to convert PDF page to image: ${error.message}`);
    }
    throw new Error('Failed to convert PDF page to image: Unknown error');
  }
}

/**
 * Get the number of pages in a PDF
 * @param file - The PDF file
 * @returns Number of pages
 */
export async function getPDFPageCount(file: File): Promise<number> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    return pdf.numPages;
  } catch (error) {
    console.log(error)
    if (error instanceof Error) {
      throw new Error(`Failed to get PDF page count: ${error.message}`);
    }
    throw new Error('Failed to get PDF page count: Unknown error');
  }
}

/**
 * Validate if a file is a valid PDF
 * @param file - The file to validate
 * @returns True if valid PDF, false otherwise
 */
export async function isValidPDF(file: File): Promise<boolean> {
  try {
    await getPDFPageCount(file);
    return true;
  } catch {
    return false;
  }
}
