"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomSelect } from '@/components/ui/custom-select';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';

export const VideoDownloadForm: React.FC = () => {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState('mp4');
  const [resolution, setResolution] = useState('720p');
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState('youtube');
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const formatOptions = [
    { value: 'mp4', label: 'MP4 (видео)' },
    { value: 'mp3', label: 'MP3 (только аудио)' }
  ];

  const resolutionOptions = [
    { value: '360p', label: '360p' },
    { value: '480p', label: '480p' },
    { value: '720p', label: '720p' },
    { value: '1080p', label: '1080p (HD)' },
    { value: '1440p', label: '1440p (2K)' },
    { value: '2160p', label: '2160p (4K)' }
  ];

  const platformOptions = [
    { value: 'youtube', label: 'YouTube' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'twitter', label: 'Twitter' },
    { value: 'vk', label: 'ВКонтакте' }
  ];

  const detectPlatform = (inputUrl: string) => {
    if (inputUrl.includes('youtube.com') || inputUrl.includes('youtu.be')) {
      setPlatform('youtube');
    } else if (inputUrl.includes('tiktok.com')) {
      setPlatform('tiktok');
    } else if (inputUrl.includes('instagram.com')) {
      setPlatform('instagram');
    } else if (inputUrl.includes('facebook.com') || inputUrl.includes('fb.com')) {
      setPlatform('facebook');
    } else if (inputUrl.includes('twitter.com') || inputUrl.includes('x.com')) {
      setPlatform('twitter');
    } else if (inputUrl.includes('vk.com')) {
      setPlatform('vk');
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    detectPlatform(newUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url) {
      toast({
        title: 'Ошибка',
        description: 'Пожалуйста, введите URL видео',
        variant: 'error',
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Формируем данные запроса
      const downloadData = {
        url,
        platform,
        format_options: {
          format: format === 'mp3' ? 'audio_only' : format,
          resolution: format === 'mp3' ? 'audio_only' : resolution,
        },
        save_history: isAuthenticated()
      };
      
      console.log('Отправляем запрос на загрузку:', downloadData);
      
      // Отправляем запрос на сервер
      const response = await fetch('/api/v1/downloads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(downloadData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка при загрузке видео');
      }
      
      const data = await response.json();
      
      toast({
        title: 'Успешно',
        description: 'Видео поставлено в очередь на загрузку',
        variant: 'success',
      });
      
      setUrl('');
    } catch (error) {
      console.error('Ошибка при загрузке видео:', error);
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Произошла ошибка при загрузке видео',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="url">URL видео</Label>
        <Input
          id="url"
          type="text"
          value={url}
          onChange={handleUrlChange}
          placeholder="https://www.youtube.com/watch?v=..."
          disabled={loading}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="platform">Платформа</Label>
        <CustomSelect
          value={platform}
          onValueChange={setPlatform}
          options={platformOptions}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="format">Формат</Label>
          <CustomSelect
            value={format}
            onValueChange={setFormat}
            options={formatOptions}
            className="w-full"
          />
        </div>
        
        {format !== 'mp3' && (
          <div className="space-y-2">
            <Label htmlFor="resolution">Разрешение</Label>
            <CustomSelect
              value={resolution}
              onValueChange={setResolution}
              options={resolutionOptions}
              className="w-full"
            />
          </div>
        )}
      </div>
      
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Загрузка...' : 'Загрузить'}
      </Button>
      
      {platform === 'instagram' && (
        <p className="text-xs text-gray-500 mt-2">
          Примечание: Для загрузки из Instagram требуется вход в аккаунт.
        </p>
      )}
      
      {!isAuthenticated() && (
        <p className="text-xs text-gray-500 mt-2">
          Примечание: История загрузок сохраняется только для авторизованных пользователей.
        </p>
      )}
    </form>
  );
}; 