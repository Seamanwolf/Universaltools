'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, Typography, Alert, Spin } from 'antd';
import axios from 'axios';
import Link from 'next/link';

const { Title, Paragraph } = Typography;

const VerifyEmailPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') || null;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError('Токен верификации отсутствует');
        setLoading(false);
        return;
      }
      
      try {
        await axios.post('/api/v1/auth/verify-email', { token });
        setSuccess(true);
      } catch (err: any) {
        console.error('Ошибка при верификации email:', err);
        if (err.response?.data?.detail) {
          setError(err.response.data.detail);
        } else {
          setError('Произошла ошибка при верификации email. Пожалуйста, попробуйте позже.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    verifyEmail();
  }, [token]);
  
  return (
    <div className="flex justify-center items-center min-h-screen p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <Title level={2}>Подтверждение Email</Title>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <Spin size="large" />
            <Paragraph className="mt-4">Проверка токена верификации...</Paragraph>
          </div>
        ) : success ? (
          <Alert
            message="Email подтвержден"
            description={
              <div className="py-2">
                <p>Ваш адрес электронной почты успешно подтвержден.</p>
                <div className="mt-4">
                  <Button type="primary" onClick={() => router.push('/auth/login')}>
                    Перейти к странице входа
                  </Button>
                </div>
              </div>
            }
            type="success"
            showIcon
            className="mb-4"
          />
        ) : (
          <Alert
            message="Ошибка подтверждения"
            description={
              <div className="py-2">
                <p>{error}</p>
                <div className="mt-4">
                  <Link href="/auth/login">
                    <Button type="primary">Вернуться на страницу входа</Button>
                  </Link>
                </div>
              </div>
            }
            type="error"
            showIcon
            className="mb-4"
          />
        )}
      </Card>
    </div>
  );
};

export default VerifyEmailPage;
