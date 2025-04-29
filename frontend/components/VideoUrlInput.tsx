"use client";

import React, { useState } from 'react';
import { videoAPI } from '@/lib/api';
import { VideoInfo } from '@/types';
import { useToast } from '@/components/ui/use-toast';

interface VideoUrlInputProps {
  onVideoInfoReceived: (videoInfo: VideoInfo) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

export default function VideoUrlInput({ 
  onVideoInfoReceived, 
  isLoading, 
  setIsLoading 
}: VideoUrlInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Пожалуйста, введите URL видео');
      return;
    }
    
    // Простая валидация URL YouTube
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (!youtubeRegex.test(url)) {
      setError('Пожалуйста, введите корректный URL видео YouTube');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const videoInfo = await videoAPI.getVideoInfo(url);
      onVideoInfoReceived(videoInfo);
      toast({
        title: "Успех!",
        description: "Информация о видео успешно получена",
        variant: "success",
      });
    } catch (err) {
      console.error('Ошибка при получении информации о видео:', err);
      setError('Не удалось получить информацию о видео. Пожалуйста, проверьте URL и попробуйте снова.');
      toast({
        title: "Ошибка",
        description: "Не удалось получить информацию о видео",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            value={url}
            onChange={handleInputChange}
            placeholder="Вставьте URL видео с YouTube"
            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Загрузка...' : 'Получить информацию'}
          </button>
        </div>
        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}
      </form>
    </div>
  );
} 