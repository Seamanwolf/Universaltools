import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { CustomSelect } from './ui/custom-select';

interface SocialMediaDownloaderProps {
  onDownload: (url: string, platform: string) => void;
}

export function SocialMediaDownloader({ onDownload }: SocialMediaDownloaderProps) {
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState('tiktok');

  const platforms = [
    { value: 'tiktok', label: 'TikTok' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'twitter', label: 'Twitter' },
    { value: 'vimeo', label: 'Vimeo' }
  ];

  const handleDownload = () => {
    if (url) {
      onDownload(url, platform);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold">Загрузчик из социальных сетей</h2>
      <div className="space-y-2">
        <Input
          type="text"
          placeholder="Вставьте ссылку на видео"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full"
        />
        <CustomSelect
          value={platform}
          onValueChange={setPlatform}
          options={platforms}
          className="w-full"
        />
        <Button
          onClick={handleDownload}
          disabled={!url}
          className="w-full"
        >
          Скачать
        </Button>
      </div>
    </div>
  );
} 