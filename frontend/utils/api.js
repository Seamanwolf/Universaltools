import axios from 'axios';

console.log('Инициализируем API клиент');
console.log('NEXT_PUBLIC_API_URL=', process.env.NEXT_PUBLIC_API_URL);

// Создаем экземпляр axios с базовым URL
export const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

console.log('API клиент настроен с baseURL:', api.defaults.baseURL);

// Перехватчик запросов: добавляем токен к каждому запросу
api.interceptors.request.use(
  (config) => {
    // Проверяем наличие токена в localStorage
    const token = localStorage.getItem('token');
    
    console.log('Отправка запроса к:', config.url);
    console.log('Метод:', config.method);
    console.log('Данные:', config.data);
    console.log('Заголовки:', config.headers);
    
    // Если токен есть, добавляем его в заголовки
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('Ошибка в интерцепторе запросов:', error);
    return Promise.reject(error);
  }
);

// Перехватчик ответов: обрабатываем ошибки
api.interceptors.response.use(
  (response) => {
    console.log('Получен ответ от:', response.config.url);
    console.log('Статус:', response.status);
    console.log('Заголовки ответа:', response.headers);
    
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    
    if (error.response) {
      console.error('Данные ответа:', error.response.data);
      console.error('Статус ответа:', error.response.status);
      console.error('Заголовки ответа:', error.response.headers);
    } else if (error.request) {
      console.error('Запрос был сделан, но ответ не получен');
      console.error('Объект запроса:', error.request);
    } else {
      console.error('Ошибка при настройке запроса:', error.message);
    }
    console.error('Конфигурация запроса:', error.config);
    
    // Обрабатываем ошибки авторизации (401)
    if (error.response && error.response.status === 401) {
      // Удаляем токен и перенаправляем на страницу входа
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default api; 