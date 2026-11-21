/// <reference types="vite/client" />
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export type FileInfo = { name: string; pages?: number; text: string };

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'bmp']);

export async function readPlanFile(file: File, onProgress: (message: string) => void): Promise<FileInfo> {
  if (file.size > MAX_FILE_SIZE) throw new Error('O arquivo precisa ter até 15 MB.');
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'txt') return { name: file.name, text: await file.text() };
  if (ext === 'docx') {
    onProgress('Lendo o documento…');
    const mammoth = await import('mammoth');
    const out = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return { name: file.name, text: out.value };
  }
  if (ext === 'pdf') {
    onProgress('Extraindo texto do PDF…');
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    try {
      const pages: string[] = [];
      const scannedPages: number[] = [];
      const imageOperations = new Set([
        pdfjs.OPS.paintImageXObject,
        pdfjs.OPS.paintInlineImageXObject,
        pdfjs.OPS.paintImageMaskXObject,
        pdfjs.OPS.paintImageXObjectRepeat,
        pdfjs.OPS.paintImageMaskXObjectRepeat,
        pdfjs.OPS.paintSolidColorImageMask,
      ]);
      for (let index = 1; index <= doc.numPages; index++) {
        const page = await doc.getPage(index);
        const content = await page.getTextContent();
        const text = content.items.map((item: any) => item.str || '').join(' ').trim();
        pages.push(text);
        if (text.length < 40) {
          const { fnArray } = await page.getOperatorList();
          if (fnArray.some(operation => imageOperations.has(operation))) scannedPages.push(index);
        }
      }

      if (scannedPages.length) {
        onProgress(`Lendo páginas digitalizadas (${scannedPages.length})…`);
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker('por');
        try {
          for (const pageNumber of scannedPages) {
            const page = await doc.getPage(pageNumber);
            const initialViewport = page.getViewport({ scale: 1 });
            const scale = Math.min(1.5, 2000 / initialViewport.width, 2000 / initialViewport.height);
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Não foi possível preparar a página para leitura.');
            await page.render({ canvas, canvasContext: context, viewport } as any).promise;
            const result = await worker.recognize(canvas);
            if (result.data.text.trim()) pages[pageNumber - 1] = result.data.text.trim();
            canvas.width = 0;
            canvas.height = 0;
          }
        } finally {
          await worker.terminate();
        }
      }
      return { name: file.name, pages: doc.numPages, text: pages.join('\n').trim() };
    } finally {
      await doc.destroy();
    }
  }
  if (IMAGE_EXTENSIONS.has(ext || '')) {
    onProgress('Lendo o texto da imagem…');
    const { default: Tesseract } = await import('tesseract.js');
    const out = await Tesseract.recognize(file, 'por');
    return { name: file.name, text: out.data.text };
  }
  throw new Error('Formato não compatível. Envie PDF, DOCX, TXT ou uma imagem.');
}

/** Finds explicit page references such as "p. 12", "páginas 12 a 15" or "pp. 12, 14 e 16". */
export function extractBookReference(text: string): string {
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const marker = /\b(?:pag(?:ina)?s?\.?|pp?\.?)\s*/gi;
  const number = String.raw`\d{1,4}`;
  const pageList = new RegExp(`${number}(?:\\s*(?:a|[-–])\\s*${number})?(?:\\s*(?:,|;|e)\\s*${number}(?:\\s*(?:a|[-–])\\s*${number})?)*`, 'i');
  const match = marker.exec(normalized);
  if (!match) return '';
  const list = pageList.exec(normalized.slice(marker.lastIndex));
  return list ? `Páginas ${list[0].replace(/\s+/g, ' ').trim()}` : '';
}



