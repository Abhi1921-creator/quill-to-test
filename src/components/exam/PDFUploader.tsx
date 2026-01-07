import { useState, useCallback } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PDFUploaderProps {
  onFileSelect: (file: File) => void;
  onTextExtracted: (text: string) => void;
  isExtracting: boolean;
}

export const PDFUploader = ({ onFileSelect, onTextExtracted, isExtracting }: PDFUploaderProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extractingText, setExtractingText] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const extractTextFromPDF = async (pdfFile: File): Promise<string> => {
    // Use pdf.js to extract text
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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

  const handleFile = async (selectedFile: File) => {
    if (selectedFile.type !== 'application/pdf') {
      return;
    }
    
    setFile(selectedFile);
    onFileSelect(selectedFile);
    
    try {
      setExtractingText(true);
      const text = await extractTextFromPDF(selectedFile);
      onTextExtracted(text);
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
    } finally {
      setExtractingText(false);
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

  const removeFile = () => {
    setFile(null);
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
            {(extractingText || isExtracting) ? (
              <div className="flex items-center gap-2 text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">
                  {extractingText ? 'Reading PDF...' : 'Extracting questions...'}
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
    >
      <CardContent className="p-12">
        <label className="flex flex-col items-center gap-4 cursor-pointer">
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
          </div>
          <Button variant="outline" className="mt-2">
            Select PDF File
          </Button>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileInput}
            className="hidden"
          />
        </label>
      </CardContent>
    </Card>
  );
};
