import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://universaltools.pro/api/v1';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Разрешаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Метод не разрешен' 
    });
  }

  try {
    const { url, format, quality, platform, save_history } = req.body;

    // Проверяем обязательные параметры
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        message: 'URL видео не указан' 
      });
    }

    // Форматируем данные в соответствии с ожиданиями API
    const apiRequestData = {
      video_url: url,
      format: format || 'video',
      quality: quality || '480',
      platform: platform || 'youtube',
      save_history: !!save_history
    };

    console.log('Отправка запроса на API:', apiRequestData);

    // Отправляем запрос на сервер
    try {
      const apiResponse = await axios.post(`${API_URL}/downloads`, apiRequestData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || ''
        }
      });

      // Возвращаем успешный ответ
      return res.status(200).json({
        success: true,
        message: 'Запрос на загрузку успешно добавлен',
        data: apiResponse.data
      });
    } catch (error) {
      console.error('Ошибка от API сервера:', error);

      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || 500;
        const errorData = error.response?.data || { message: 'Внутренняя ошибка сервера' };

        return res.status(statusCode).json({
          success: false,
          message: errorData.message || errorData.detail || 'Произошла ошибка при обработке запроса',
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