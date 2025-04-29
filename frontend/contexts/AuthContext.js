'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';
import { message } from 'antd';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Проверяем авторизацию при инициализации
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          await fetchUserData(token);
        } catch (err) {
          console.error('Ошибка при проверке авторизации:', err);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Получение данных пользователя по токену
  const fetchUserData = async (token) => {
    try {
      // Устанавливаем токен в заголовки
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      console.log('Запрашиваем данные пользователя, URL:', '/users/me');
      console.log('Заголовки:', api.defaults.headers.common);
      
      // Запрашиваем данные пользователя
      const response = await api.get('/users/me');
      setUser(response.data);
      setError(null);
      return response.data;
    } catch (err) {
      console.error('Ошибка при получении данных пользователя:', err);
      console.error('Конфигурация запроса:', err?.config);
      if (err.response) {
        console.error('Ответ сервера:', err.response.data);
        console.error('Статус ответа:', err.response.status);
        console.error('Заголовки ответа:', err.response.headers);
      }
      setUser(null);
      throw err;
    }
  };

  // Вход в систему
  const login = async (email, password) => {
    setLoading(true);
    try {
      // Создаем URLSearchParams вместо FormData
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);
      
      console.log('Отправляем запрос на логин, URL:', '/auth/login');
      console.log('Параметры:', {username: email, password: '***'});
      console.log('Базовый URL API:', api.defaults.baseURL);
      console.log('withCredentials:', api.defaults.withCredentials);
      
      // Устанавливаем правильные заголовки для form-urlencoded
      const response = await api.post('/auth/login', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      console.log('Успешный вход, данные:', response.data);
      
      const { access_token, token_type } = response.data;
      
      // Сохраняем токен
      localStorage.setItem('token', access_token);
      
      // Устанавливаем токен в заголовки
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Получаем данные пользователя
      await fetchUserData(access_token);
      
      message.success('Вход выполнен успешно!');
      return true;
    } catch (err) {
      console.error('Ошибка при входе:', err);
      console.error('Конфигурация запроса:', err?.config);
      if (err.response) {
        console.error('Ответ сервера:', err.response.data);
        console.error('Статус ответа:', err.response.status);
        console.error('Заголовки ответа:', err.response.headers);
      }
      const errorMsg = err.response?.data?.detail || 'Ошибка при входе. Проверьте данные и попробуйте снова.';
      setError(errorMsg);
      message.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Регистрация
  const register = async (email, username, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register', {
        email,
        username,
        password
      });
      
      const { access_token, token_type } = response.data;
      
      // Сохраняем токен
      localStorage.setItem('token', access_token);
      
      // Устанавливаем токен в заголовки
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Получаем данные пользователя
      await fetchUserData(access_token);
      
      message.success('Регистрация выполнена успешно!');
      return true;
    } catch (err) {
      console.error('Ошибка при регистрации:', err);
      const errorMsg = err.response?.data?.detail || 'Ошибка при регистрации. Пожалуйста, попробуйте снова.';
      setError(errorMsg);
      message.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Выход из системы
  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    message.success('Вы вышли из системы.');
  };

  // Проверка авторизации
  const isAuthenticated = () => !!user;

  // Проверка роли пользователя
  const hasRole = (role) => {
    return user && user.role === role;
  };

  // Предоставляем значения контекста
  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated,
    hasRole
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext); 