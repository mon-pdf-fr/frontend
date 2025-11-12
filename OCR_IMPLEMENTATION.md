# PDF OCR & Data Extraction - Complete Implementation Guide

## Overview

This is a **fully client-side PDF OCR and data extraction feature** that runs entirely in the browser with no server-side processing or API calls. It uses advanced OCR technology to extract text from scanned PDFs, detect tables, find key-value pairs, and export data in multiple formats.

## Features

### 🔍 Core Functionality
- **Advanced OCR**: Extract text from scanned and digital PDFs with high accuracy
- **Multi-language Support**: 10+ languages including English, French, Spanish, German, Chinese, Japanese, Arabic, etc.
- **Table Detection**: Automatically identify and extract tabular data
- **Key-Value Pair Extraction**: Find structured data like "Name: John", "Date: 2024-01-01"
- **Visual Preview**: Interactive canvas with bounding box highlighting
- **Data Selection**: Select specific tables and key-value pairs for export

### 📤 Export Options
- **CSV Format**: Export tables and key-value pairs as CSV files
- **JSON Format**: Export structured data with metadata
- **TXT Format**: Export as formatted plain text
- **Clipboard**: Copy extracted text directly to clipboard

### 🎨 User Experience
- **Progress Tracking**: Real-time progress for PDF conversion and OCR
- **Visual Feedback**: Interactive highlighting and selection
- **Error Handling**: Comprehensive error messages and validation
- **Performance Optimization**: Sequential processing with progress updates
- **File Size Limits**: 50MB max with warnings for large PDFs

## Architecture

### 1. PDF to Image Conversion (`lib/ocr/pdf-to-image.ts`)

Converts PDF pages to canvas elements for OCR processing:

```typescript
import { convertPDFToImages, getPDFPageCount } from '@/lib/ocr/pdf-to-image';

// Convert all pages
const images = await convertPDFToImages(file, (progress) => {
  console.log(`Converting page ${progress.currentPage}/${progress.totalPages}`);
});

// Get page count
const pageCount = await getPDFPageCount(file);
```

**Key Functions:**
- `convertPDFToImages()`: Convert entire PDF to canvas array
- `convertPDFPageToImage()`: Convert single page
- `getPDFPageCount()`: Get total page count
- `isValidPDF()`: Validate PDF file

### 2. OCR Engine (`lib/ocr/ocr-engine.ts`)

Manages Tesseract.js workers for OCR processing:

```typescript
import { createOCREngine } from '@/lib/ocr/ocr-engine';

// Initialize engine
const engine = await createOCREngine('eng');

// Recognize single image
const result = await engine.recognize(canvas, (progress) => {
  console.log(`${progress.status}: ${progress.progress}%`);
});

// Recognize multiple images
const results = await engine.recognizeMultiple(canvases);

// Change language
await engine.changeLanguage('fra');

// Clean up
await engine.terminate();
```

**Features:**
- Automatic worker management
- Progress callbacks
- Multi-page processing
- Language switching
- Word and line extraction with bounding boxes

### 3. Data Extraction (`lib/ocr/data-extraction.ts`)

Analyzes OCR results to detect tables and key-value pairs:

```typescript
import { extractAllData, detectTables, detectKeyValuePairs } from '@/lib/ocr/data-extraction';

// Extract all data
const data = extractAllData(ocrResults);

// Access extracted data
console.log(data.tables); // DetectedTable[]
console.log(data.keyValuePairs); // KeyValuePair[]
console.log(data.allText); // string
console.log(data.pageTexts); // Map<number, string>
```

**Detection Algorithms:**
- **Table Detection**:
  - Groups lines by vertical position
  - Detects column positions using spatial clustering
  - Constructs table structure with rows and cells
  - Minimum 3 rows and 2 columns required

- **Key-Value Detection**:
  - Pattern matching for "Key: Value"
  - Supports colon, dash, and equals separators
  - Includes confidence scores

### 4. Export Utilities (`lib/ocr/export-utils.ts`)

Export extracted data in multiple formats:

```typescript
import { exportData, exportTableAsCSV, copyToClipboard } from '@/lib/ocr/export-utils';

// Export all data
exportData(extractedData, {
  format: 'csv',
  includeTables: true,
  includeKeyValuePairs: true,
  includeAllText: true,
  fileName: 'my-data'
});

// Export single table
exportTableAsCSV(table, 'table-name');

// Copy to clipboard
await copyToClipboard(extractedData, 'text');
```

**Export Formats:**
- **CSV**: Each table and key-value list as separate files
- **JSON**: Structured data with metadata
- **TXT**: Formatted plain text with borders

### 5. Visual Components

#### OCRViewer (`components/ocr/ocr-viewer.tsx`)
Interactive canvas overlay with selection capabilities:

```typescript
<OCRViewer
  canvas={pdfCanvas}
  words={ocrResult.words}
  lines={ocrResult.lines}
  showBoundingBoxes={true}
  onWordSelect={(wordIds) => console.log(wordIds)}
/>
```

**Features:**
- Bounding box visualization
- Click/drag selection
- Word highlighting
- Real-time visual feedback

#### PDFOCRTool (`components/ocr/pdf-ocr-tool.tsx`)
Main component with complete UI:

```typescript
<PDFOCRTool />
```

**Includes:**
- File upload with validation
- Language selection
- Progress tracking
- Tabbed results view (Text, Tables, Key-Values, Preview)
- Export panel with format selection
- Error handling and user feedback

## Usage Example

### Basic Implementation

```typescript
'use client';

import { PDFOCRTool } from '@/components/ocr/pdf-ocr-tool';

export default function OCRPage() {
  return (
    <div className="container mx-auto p-4">
      <h1>PDF OCR Tool</h1>
      <PDFOCRTool />
    </div>
  );
}
```

### Custom Implementation

```typescript
import { convertPDFToImages } from '@/lib/ocr/pdf-to-image';
import { createOCREngine } from '@/lib/ocr/ocr-engine';
import { extractAllData } from '@/lib/ocr/data-extraction';
import { exportData } from '@/lib/ocr/export-utils';

async function processCustomPDF(file: File) {
  // Step 1: Convert PDF to images
  const images = await convertPDFToImages(file);

  // Step 2: Perform OCR
  const engine = await createOCREngine('eng');
  const results = await engine.recognizeMultiple(
    images.map(img => img.canvas)
  );
  await engine.terminate();

  // Step 3: Extract data
  const data = extractAllData(results);

  // Step 4: Export
  exportData(data, {
    format: 'json',
    fileName: 'extracted-data'
  });

  return data;
}
```

## Performance Considerations

### Optimization Strategies

1. **Sequential Processing**: Pages processed one at a time to avoid memory issues
2. **Progress Callbacks**: Real-time feedback keeps UI responsive
3. **Canvas Rendering**: Efficient rendering at 2x scale for OCR accuracy
4. **Worker Management**: Single Tesseract worker to control memory usage
5. **File Size Limits**: 50MB maximum with user warnings for large files

### Memory Management

```typescript
// Recommended approach for large PDFs
async function processLargePDF(file: File) {
  const pageCount = await getPDFPageCount(file);

  // Process in batches
  const batchSize = 5;
  for (let i = 0; i < pageCount; i += batchSize) {
    const batch = await processBatch(file, i, Math.min(i + batchSize, pageCount));
    // Process batch results
  }
}
```

### Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 14+)
- **Mobile**: Supported but may be slower

## Error Handling

### Validation

```typescript
// File validation
if (file.size > 50 * 1024 * 1024) {
  throw new Error('File too large. Maximum 50MB.');
}

// PDF validation
const isValid = await isValidPDF(file);
if (!isValid) {
  throw new Error('Invalid PDF file.');
}

// Page count warning
const pageCount = await getPDFPageCount(file);
if (pageCount > 20) {
  const confirmed = confirm(`This PDF has ${pageCount} pages. Continue?`);
  if (!confirmed) return;
}
```

### Error States

The implementation handles these error scenarios:
- Invalid PDF files
- Corrupted pages
- Oversized files
- OCR failures
- Export errors
- Browser incompatibilities

## Security & Privacy

### Client-Side Processing

- **Zero Server Contact**: All processing happens in the browser
- **No File Upload**: Files never leave the user's device
- **No Analytics**: No tracking of file contents
- **Local Storage**: No persistent storage of uploaded files

### CDN Resources

The implementation uses these CDN resources:
- **PDF.js Worker**: CloudFlare CDN
- **Tesseract.js**: JSDelivr CDN
- **Language Data**: Project Naptha Tessdata

All external resources are from trusted sources and loaded over HTTPS.

## Testing

### Manual Testing Checklist

- [ ] Upload scanned PDF (< 5 pages)
- [ ] Upload digital PDF with text
- [ ] Upload large PDF (> 20 pages)
- [ ] Test each language option
- [ ] Verify table detection
- [ ] Verify key-value detection
- [ ] Test CSV export
- [ ] Test JSON export
- [ ] Test TXT export
- [ ] Test bounding box visualization
- [ ] Test word selection
- [ ] Test clipboard copy
- [ ] Test error handling (invalid file, oversized file)

### Test Files

Recommended test files:
- Simple invoice (table detection)
- Form with labels (key-value detection)
- Multi-page document (pagination)
- Mixed content (text + tables)
- Non-English document (language support)

## Localization

The feature supports full internationalization via next-intl:

```json
{
  "tools": {
    "ocr": {
      "title": "PDF OCR & Data Extraction",
      "description": "Extract text from scanned PDFs",
      "selectLanguage": "OCR Language",
      "exportCSV": "Export as CSV",
      ...
    }
  }
}
```

Translations included for:
- English (en)
- French (fr)

## File Structure

```
my-pdf/
├── lib/ocr/
│   ├── pdf-to-image.ts      # PDF → Canvas conversion
│   ├── ocr-engine.ts         # Tesseract.js wrapper
│   ├── data-extraction.ts    # Table/KV detection
│   └── export-utils.ts       # CSV/JSON/TXT export
├── components/ocr/
│   ├── ocr-viewer.tsx        # Interactive canvas viewer
│   └── pdf-ocr-tool.tsx      # Main UI component
├── app/[locale]/ocr/
│   ├── page.tsx              # OCR page
│   └── layout.tsx            # Page metadata
└── messages/
    ├── en.json               # English translations
    └── fr.json               # French translations
```

## Dependencies

```json
{
  "dependencies": {
    "tesseract.js": "^5.x",
    "papaparse": "^5.x",
    "pdfjs-dist": "latest",
    "@cantoo/pdf-lib": "^2.5.3"
  },
  "devDependencies": {
    "@types/papaparse": "^5.x"
  }
}
```

## Future Enhancements

Potential improvements:
- [ ] Web Worker for background processing
- [ ] IndexedDB for caching results
- [ ] Advanced table editing
- [ ] Custom export templates
- [ ] Batch processing multiple PDFs
- [ ] AI-powered field extraction
- [ ] Form field detection
- [ ] Signature extraction
- [ ] Handwriting recognition (requires additional models)

## Troubleshooting

### Common Issues

**OCR accuracy is poor:**
- Increase scale factor in `convertPDFToImages()` (default: 2)
- Try different language models
- Ensure PDF quality is sufficient

**Out of memory errors:**
- Reduce file size
- Process fewer pages at once
- Close other browser tabs

**Slow performance:**
- Large PDFs take time (normal)
- Consider batch processing
- Use a more powerful device

**Tables not detected:**
- Ensure table has clear structure
- Minimum 3 rows and 2 columns required
- Try adjusting detection thresholds

## Support

For issues, questions, or contributions:
- GitHub Issues: [your-repo]/issues
- Documentation: This file
- Code comments: Inline documentation

## License

This implementation is part of the Mon PDF project. All code is client-side and open source.
