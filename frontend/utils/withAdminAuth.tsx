'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Spin } from 'antd';

export function withAdminAuth(Component: React.ComponentType) {
  return function WithAdminAuth(props: any) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && (!user || user.role !== 'admin')) {
        router.push('/');
      }
    }, [user, isLoading, router]);

    if (isLoading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Spin size="large" tip="Проверка авторизации..." />
        </div>
      );
    }

    // Если пользователь не админ, не отображаем компонент (редирект уже сработает в useEffect)
    if (!user || user.role !== 'admin') {
      return null;
    }

    // Если пользователь админ, рендерим защищенный компонент
    return <Component {...props} />;
  };
} 