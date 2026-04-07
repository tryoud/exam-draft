import * as pdfjsLib from 'pdfjs-dist';
import type { ExtractedFile, PDFMode } from './types';

const WORKER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let workerInitialized = false;
function initWorker() {
  if (!workerInitialized && typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_SRC;
    workerInitialized = true;
  }
}

const MAX_CHARS_EXAM = 160000;
const MAX_CHARS_SLIDES = 40000; // Slides are supplementary context; 40k chars (~10k tokens) is sufficient

// Shared helper — samples up to 5 pages in parallel and extrapolates image count.
async function countImages(pdf: pdfjsLib.PDFDocumentProxy, pageCount: number): Promise<number> {
  const pagesToCheck = Math.min(pageCount, 5);
  const counts = await Promise.all(
    Array.from({ length: pagesToCheck }, (_, i) => i + 1).map(async (i) => {
      const page = await pdf.getPage(i);
      const ops = await page.getOperatorList();
      return ops.fnArray.filter((fn: number) => fn === pdfjsLib.OPS.paintImageXObject).length;
    })
  );
  const sampled = counts.reduce((a, b) => a + b, 0);
  return pageCount > pagesToCheck
    ? Math.round((sampled / pagesToCheck) * pageCount)
    : sampled;
}

export async function analyzePDF(file: File): Promise<{
  pageCount: number;
  imageCount: number;
  hasSignificantImages: boolean;
  recommendedMode: PDFMode;
}> {
  initWorker();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  try {
    const pageCount = pdf.numPages;
    const imageCount = await countImages(pdf, pageCount);
    const hasSignificantImages = imageCount / pageCount > 0.3;
    return {
      pageCount,
      imageCount,
      hasSignificantImages,
      recommendedMode: hasSignificantImages ? 'image_recommended' : 'text',
    };
  } finally {
    pdf.destroy();
  }
}

export async function extractText(
  file: File,
  type: 'exam' | 'slides'
): Promise<ExtractedFile> {
  initWorker();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  try {
    const pageCount = pdf.numPages;

    // Extract all pages in parallel for faster processing
    const pageTexts = await Promise.all(
      Array.from({ length: pageCount }, (_, i) => i + 1).map(async (i) => {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = (content.items as Array<{ str: string }>)
          .map((item) => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        return pageText.length > 10 ? `[Seite ${i}]\n${pageText}\n\n` : '';
      })
    );
    const fullText = pageTexts.join('');

    const maxChars = type === 'exam' ? MAX_CHARS_EXAM : MAX_CHARS_SLIDES;
    const capped =
      fullText.length > maxChars
        ? fullText.slice(0, maxChars) + '\n[Text gekürzt]'
        : fullText;

    const imageCount = await countImages(pdf, pageCount);

    return {
      name: file.name,
      size: file.size,
      type,
      mode: 'text',
      text: capped,
      base64: null,
      tokenEstimate: Math.ceil(capped.length / 4),
      pageCount,
      imageCount,
      hasSignificantImages: imageCount / pageCount > 0.3,
    };
  } finally {
    pdf.destroy();
  }
}

export async function extractAsImage(
  file: File,
  type: 'exam' | 'slides'
): Promise<ExtractedFile> {
  const { pageCount, imageCount } = await analyzePDF(file);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      const tokenEstimate = pageCount * 750;
      resolve({
        name: file.name,
        size: file.size,
        type,
        mode: 'image',
        text: null,
        base64,
        tokenEstimate,
        pageCount,
        imageCount,
        hasSignificantImages: true,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function processFile(
  file: File,
  type: 'exam' | 'slides',
  useImageMode: boolean
): Promise<ExtractedFile> {
  if (useImageMode) {
    return extractAsImage(file, type);
  }
  return extractText(file, type);
}
