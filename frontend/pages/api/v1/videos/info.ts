import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://universaltools.pro/api/v1';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Разрешаем только GET запросы
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      message: 'Метод не разрешен' 
    });
  }

  try {
    const { url } = req.query;

    // Проверяем обязательные параметры
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        message: 'URL видео не указан' 
      });
    }

    // Проверяем авторизацию пользователя
    const isAuthenticated = !!req.headers.authorization;

    // Отправляем запрос на сервер
    try {
      const apiResponse = await axios.get(`${API_URL}/videos/info`, {
        params: { url },
        headers: {
          'Authorization': req.headers.authorization || ''
        }
      });

      // Получаем информацию о видео
      const videoInfo = apiResponse.data;

      // Если пользователь не авторизован, ограничиваем доступные форматы
      if (!isAuthenticated && videoInfo && videoInfo.formats) {
        // Фильтруем форматы, чтобы оставить только <= 480p
        videoInfo.formats = videoInfo.formats.filter((format: any) => {
          // Если это аудио формат, оставляем
          if (format.format_type === 'audio') return true;
          
          // Если это видео формат, проверяем разрешение
          const resolution = format.resolution || format.quality || '';
          const height = parseInt(resolution.replace('p', ''), 10);
          
          // Оставляем только разрешения до 480p включительно
          return !height || height <= 480;
        });
        
        // Добавляем отметку о режиме неавторизованного пользователя
        videoInfo.anonymous_mode = true;
      }

      // Возвращаем успешный ответ
      return res.status(200).json(videoInfo);
    } catch (error) {
      console.error('Ошибка от API сервера:', error);

      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || 500;
        const errorData = error.response?.data || { message: 'Внутренняя ошибка сервера' };

        return res.status(statusCode).json({
          success: false,
          message: errorData.message || errorData.detail || 'Произошла ошибка при получении информации о видео',
          error: errorData
        });
      }

      // Если это не AxiosError, возвращаем общую ошибку
      return res.status(500).json({
        success: false,
        message: 'Произошла неизвестная ошибка'
      });
    }
  } catch (error) {
    console.error('Ошибка при обработке запроса:', error);
    return res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
} 