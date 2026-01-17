import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, X, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface PDFUploaderProps {
  onFileSelect: (file: File) => void;
  onTextExtracted: (text: string) => void;
  onImagesExtracted?: (imageUrls: string[]) => void;
  isExtracting: boolean;
}

export const PDFUploader = ({ onFileSelect, onTextExtracted, onImagesExtracted, isExtracting }: PDFUploaderProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extractingText, setExtractingText] = useState(false);
  const [extractingImages, setExtractingImages] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const extractTextFromPDF = async (pdfFile: File): Promise<string> => {
    const pdfjsLib = await import('pdfjs-dist');
    
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).toString();

    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += `\n--- Page ${i} ---\n${pageText}`;
    }
    
    return fullText;
  };

  const renderPageToImage = async (
    pdf: any,
    pageNum: number,
    scale: number = 2.0
  ): Promise<Blob> => {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob from canvas'));
        },
        'image/jpeg',
        0.85
      );
    });
  };

  const uploadImageToStorage = async (
    blob: Blob,
    fileName: string
  ): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('pdf-pages')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('pdf-pages')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const extractImagesFromPDF = async (pdfFile: File): Promise<string[]> => {
    const pdfjsLib = await import('pdfjs-dist');
    
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).toString();

    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const imageUrls: string[] = [];
    const uploadId = crypto.randomUUID();
    
    for (let i = 1; i <= pdf.numPages; i++) {
      setProgress(Math.round((i / pdf.numPages) * 100));
      setProgressMessage(`Processing page ${i} of ${pdf.numPages}...`);
      
      try {
        const blob = await renderPageToImage(pdf, i);
        const fileName = `${uploadId}/page-${i.toString().padStart(3, '0')}.jpg`;
        const url = await uploadImageToStorage(blob, fileName);
        imageUrls.push(url);
      } catch (err) {
        console.error(`Failed to process page ${i}:`, err);
      }
    }
    
    return imageUrls;
  };

  const handleFile = async (selectedFile: File) => {
    if (selectedFile.type !== 'application/pdf') {
      return;
    }
    
    setFile(selectedFile);
    onFileSelect(selectedFile);
    
    try {
      // Extract text first
      setExtractingText(true);
      setProgressMessage('Reading PDF text...');
      const text = await extractTextFromPDF(selectedFile);
      onTextExtracted(text);
      setExtractingText(false);
      
      // Then extract images
      setExtractingImages(true);
      setProgress(0);
      setProgressMessage('Rendering pages as images...');
      const imageUrls = await extractImagesFromPDF(selectedFile);
      onImagesExtracted?.(imageUrls);
      setProgressMessage(`Uploaded ${imageUrls.length} page images`);
    } catch (error) {
      console.error('Error processing PDF:', error);
    } finally {
      setExtractingText(false);
      setExtractingImages(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setFile(null);
    setProgress(0);
    setProgressMessage('');
  };

  if (file) {
    return (
      <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {(extractingText || extractingImages || isExtracting) ? (
              <div className="flex items-center gap-2 text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">
                  {extractingText ? 'Reading PDF...' : 
                   extractingImages ? 'Rendering pages...' : 
                   'Extracting questions...'}
                </span>
              </div>
            ) : (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={removeFile}
                className="shrink-0"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
          
          {extractingImages && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ImageIcon className="h-4 w-4" />
                <span>{progressMessage}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
          
          {!extractingText && !extractingImages && !isExtracting && progressMessage && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
              <ImageIcon className="h-4 w-4" />
              <span>{progressMessage}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "border-2 border-dashed transition-colors cursor-pointer",
        isDragging 
          ? "border-primary bg-primary/5" 
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleButtonClick}
    >
      <CardContent className="p-12">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">
              Drop your exam PDF here
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse files
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              <ImageIcon className="inline h-3 w-3 mr-1" />
              Diagrams and images will be extracted automatically
            </p>
          </div>
          <Button variant="outline" className="mt-2" onClick={(e) => { e.stopPropagation(); handleButtonClick(); }}>
            Select PDF File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      </CardContent>
    </Card>
  );
};
