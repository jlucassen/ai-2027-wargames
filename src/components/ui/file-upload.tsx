import React, { useRef } from 'react';
import { Button } from './button';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  onFileLoaded: (content: string) => void;
  accept?: string;
  buttonText?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileLoaded, 
  accept = ".json", 
  buttonText = "Upload"
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      onFileLoaded(content);
      
      // Reset the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        accept={accept}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <Button variant="outline" size="sm" onClick={handleButtonClick}>
        <Upload className="mr-2 h-4 w-4" /> {buttonText}
      </Button>
    </>
  );
};