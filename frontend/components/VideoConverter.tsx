import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { CustomSelect } from './ui/custom-select';

interface VideoConverterProps {
  onConvert: (file: File, format: string) => void;
}

export function VideoConverter({ onConvert }: VideoConverterProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [format, setFormat] = useState('mp4');

  const formats = [
    { value: 'mp4', label: 'MP4' },
    { value: 'avi', label: 'AVI' },
    { value: 'mkv', label: 'MKV' },
    { value: 'mov', label: 'MOV' },
    { value: 'webm', label: 'WebM' }
  ];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleConvert = () => {
    if (selectedFile) {
      onConvert(selectedFile, format);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold">Конвертер видео</h2>
      <div className="space-y-2">
        <Input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="w-full"
        />
        <CustomSelect
          value={format}
          onValueChange={setFormat}
          options={formats}
          className="w-full"
        />
        <Button
          onClick={handleConvert}
          disabled={!selectedFile}
          className="w-full"
        >
          Конвертировать
        </Button>
      </div>
    </div>
  );
} 