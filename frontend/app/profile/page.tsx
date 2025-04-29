'use client';

import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Tabs, Avatar, Menu, Dropdown, Row, Col, Statistic, List, Tag, Space, Divider, message, Skeleton } from 'antd';
import { 
  UserOutlined, 
  SettingOutlined, 
  LogoutOutlined, 
  CrownOutlined, 
  HistoryOutlined, 
  KeyOutlined, 
  BellOutlined,
  DownOutlined,
  DownloadOutlined,
  StarOutlined,
  TeamOutlined
} from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { videoAPI } from '@/lib/api';
import dynamic from 'next/dynamic';
import ClientOnly from '@/components/ClientOnly';
import { useAuth } from '@/contexts/AuthContext';

const NavBar = dynamic(() => import('@/components/NavBar'), { ssr: false });

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

// Типы для данных пользователя
interface UserProfile {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  created_at: string;
  downloads_count: number;
  subscription_type: string;
  role?: string;
}

// Тип для загрузок пользователя
interface Download {
  id: string;
  title: string;
  type: 'video' | 'audio';
  date: string;
  size: string;
  thumbnail: string;
}

const ProfilePage = () => {
  const { user: authUser, logout, isAuthenticated } = useAuth();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [recentDownloads, setRecentDownloads] = useState<Download[]>([]);

  useEffect(() => {
    if (!isAuthenticated()) {
      message.error('Необходимо авторизоваться для доступа к профилю');
      router.push('/');
      return;
    }

    const fetchProfileData = async () => {
      try {
        setLoading(true);
        // В реальном приложении здесь был бы API запрос
        // const data = await videoAPI.getUserProfile();
        
        // Используем данные из AuthContext, если это возможно, 
        // или добавляем временные данные для демонстрации
        if (authUser) {
          setProfileData({
            id: authUser.id || 1,
            username: authUser.username || 'пользователь',
            email: authUser.email || 'email@example.com',
            avatar: authUser.avatar,
            created_at: authUser.created_at || new Date().toISOString(),
            downloads_count: authUser.downloads_count || 0,
            subscription_type: authUser.subscription_type || 'free',
            role: authUser.role
          });
        }
      } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
        message.error('Не удалось загрузить данные профиля');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [authUser, isAuthenticated, router]);

  useEffect(() => {
    // Имитация загрузки данных
    setTimeout(() => {
      setRecentDownloads([
        {
          id: '1',
          title: 'Как скачать видео с YouTube - Туториал',
          type: 'video',
          date: '2023-06-15',
          size: '128 MB',
          thumbnail: 'https://via.placeholder.com/120x68',
        },
        {
          id: '2',
          title: 'Лучшие песни 2023 года - Сборник',
          type: 'audio',
          date: '2023-06-12',
          size: '45 MB',
          thumbnail: 'https://via.placeholder.com/120x68',
        },
        {
          id: '3',
          title: 'Обзор нового iPhone 15 Pro - Распаковка и тесты',
          type: 'video',
          date: '2023-06-10',
          size: '215 MB',
          thumbnail: 'https://via.placeholder.com/120x68',
        },
      ]);
      setIsLoading(false);
    }, 1500);
  }, []);

  // Получение информации о подписке
  const getSubscriptionInfo = (type: string) => {
    switch (type) {
      case 'free':
        return { name: 'Бесплатный', color: 'default' };
      case 'day':
        return { name: 'День', color: 'orange' };
      case 'month':
        return { name: 'Месяц', color: 'blue' };
      case 'halfyear':
        return { name: '6 месяцев', color: 'purple' };
      case 'year':
        return { name: 'Год', color: 'green' };
      case 'unlimited':
        return { name: 'Безлимит', color: 'gold' };
      default:
        return { name: type, color: 'default' };
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Форматирование даты
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center">
        <ClientOnly>
          <NavBar />
        </ClientOnly>
        
        <div className="w-full">
          <div className="container mx-auto px-4 py-8">
            <div className="flex justify-center items-center min-h-[60vh]">Загрузка данных профиля...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex min-h-screen flex-col items-center">
        <ClientOnly>
          <NavBar />
        </ClientOnly>
        
        <div className="w-full">
          <div className="container mx-auto px-4 py-8">
            <div className="flex justify-center items-center min-h-[60vh]">
              <Card>
                <Title level={4}>Профиль недоступен</Title>
                <Paragraph>Не удалось загрузить данные профиля. Пожалуйста, войдите в систему.</Paragraph>
                <Button type="primary" onClick={() => router.push('/')}>На главную</Button>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ClientOnly>
        <NavBar />
      </ClientOnly>
      
      <div className="flex min-h-screen flex-col items-center">
        <div className="container mx-auto px-4 py-8">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton avatar paragraph={{ rows: 4 }} active />
              <Skeleton paragraph={{ rows: 8 }} active />
            </div>
          ) : (
            <>
              <Card className="mb-6">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  <Avatar size={96} icon={<UserOutlined />} src={profileData.avatar} />
                  <div className="flex-grow text-center md:text-left">
                    <Title level={3}>{profileData.username}</Title>
                    <Paragraph>{profileData.email}</Paragraph>
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                      {profileData.role && (
                        <Tag color={profileData.role === 'admin' ? 'red' : 'blue'} className="mb-2">
                          {profileData.role === 'admin' ? 'Администратор' : 'Пользователь'}
                        </Tag>
                      )}
                      {profileData.subscription_type && (
                        <Tag color={getSubscriptionInfo(profileData.subscription_type).color}>
                          Тариф: {getSubscriptionInfo(profileData.subscription_type).name}
                        </Tag>
                      )}
                    </div>
                    <div className="mt-2">
                      <Text type="secondary">
                        С нами с {formatDate(profileData.created_at)}
                      </Text>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button type="primary" href="/subscriptions" icon={<CrownOutlined />} block>
                      Управление тарифом
                    </Button>
                    <Button className="mt-3" href="/settings" icon={<SettingOutlined />} block>
                      Настройки профиля
                    </Button>
                    <Button className="mt-3" danger icon={<LogoutOutlined />} onClick={handleLogout} block>
                      Выйти
                    </Button>
                  </div>
                </div>
              </Card>

              <Row gutter={[16, 16]} className="mb-6">
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic 
                      title="Всего загрузок" 
                      value={profileData.downloads_count} 
                      prefix={<DownloadOutlined />} 
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic 
                      title="Объем загрузок" 
                      value={profileData.downloads_count * 0.001} 
                      suffix="GB" 
                      precision={1} 
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic 
                      title="Экономия времени" 
                      value={profileData.downloads_count * 10} 
                      suffix="мин" 
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card>
                    <Statistic 
                      title="Доступное место" 
                      value={100 - profileData.downloads_count * 0.001} 
                      suffix="%" 
                      valueStyle={{ color: '#3f8600' }} 
                    />
                  </Card>
                </Col>
              </Row>

              <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <TabPane tab="Обзор профиля" key="profile">
                  <Title level={4}>Последние действия</Title>
                  <List
                    itemLayout="horizontal"
                    dataSource={recentDownloads}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          title={item.title}
                          description={
                            <div>
                              <Tag color={item.type === 'video' ? 'blue' : 'purple'}>
                                {item.type === 'video' ? 'Видео' : 'Аудио'}
                              </Tag>
                              <Text type="secondary"> {item.date} • {item.size}</Text>
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </TabPane>
                
                <TabPane tab="Загрузки" key="downloads">
                  <Button type="primary" href="/downloads" className="mb-4">
                    Перейти к истории загрузок
                  </Button>
                  <Paragraph>
                    В разделе "Мои загрузки" вы можете увидеть полную историю ваших загрузок 
                    и конвертаций, управлять файлами и повторно скачивать контент.
                  </Paragraph>
                </TabPane>
                
                <TabPane tab="Тарифы" key="subscriptions">
                  <Button type="primary" href="/subscriptions" className="mb-4">
                    Управление тарифами
                  </Button>
                  <Paragraph>
                    Текущий тариф: <strong>{getSubscriptionInfo(profileData.subscription_type).name}</strong>
                  </Paragraph>
                  <Paragraph>
                    В разделе "Управление тарифами" вы можете изменить ваш текущий тариф, 
                    получить информацию о доступных функциях и лимитах, а также управлять 
                    автоматическим продлением подписки.
                  </Paragraph>
                </TabPane>
              </Tabs>

              <Card title="Советы по использованию" className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Title level={5}>Оптимизация загрузок</Title>
                    <ul className="list-disc pl-5">
                      <li>Используйте конвертер форматов для экономии места</li>
                      <li>Скачивайте аудио вместо видео для музыкальных клипов</li>
                      <li>Планируйте загрузки на время, когда вы не используете интернет активно</li>
                    </ul>
                  </div>
                  <div>
                    <Title level={5}>Управление хранилищем</Title>
                    <ul className="list-disc pl-5">
                      <li>Регулярно удаляйте ненужные загрузки из истории</li>
                      <li>Используйте сжатие для видео файлов</li>
                      <li>Обновите тарифный план, если вам требуется больше места</li>
                    </ul>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="text-center">
                  <Title level={4}>Хотите больше возможностей?</Title>
                  <Paragraph>
                    Перейдите на PRO-план, чтобы получить неограниченные загрузки, приоритетную поддержку и дополнительное пространство для хранения
                  </Paragraph>
                  <Button type="primary" size="large">
                    Обновить до PRO
                  </Button>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ProfilePage; 