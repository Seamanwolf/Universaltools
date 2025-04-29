'use client';

import React, { useState } from 'react';
import { Card, Typography, Button, Dropdown, Menu, Space, Avatar } from 'antd';
import { DownOutlined, CrownOutlined, HistoryOutlined, SettingOutlined, LogoutOutlined, UserOutlined, ToolOutlined, DashboardOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';

const { Title, Text } = Typography;

interface NavBarProps {
  // Дополнительные пропсы, если нужны
}

export const NavBar: React.FC<NavBarProps> = () => {
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuth();
  const [authModalVisible, setAuthModalVisible] = useState(false);
  
  // Проверка текущего маршрута для подсветки активной вкладки
  const isActive = (path: string) => {
    return pathname === path;
  };

  // Проверка роли администратора
  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  const showAuthModal = () => {
    setAuthModalVisible(true);
  };

  const hideAuthModal = () => {
    setAuthModalVisible(false);
  };

  const handleLogout = () => {
    logout();
  };

  // Формирование выпадающего меню профиля
  const profileMenu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        <Link href="/profile">Мой профиль</Link>
      </Menu.Item>
      <Menu.Item key="subscriptions" icon={<CrownOutlined />}>
        <Link href="/subscriptions">Управление тарифами</Link>
      </Menu.Item>
      <Menu.Item key="history" icon={<HistoryOutlined />}>
        <Link href="/downloads">История загрузок</Link>
      </Menu.Item>
      {isAdmin() && (
        <>
          <Menu.Divider />
          <Menu.Item key="admin" icon={<DashboardOutlined />}>
            <Link href="/admin">Панель администратора</Link>
          </Menu.Item>
        </>
      )}
      <Menu.Divider />
      <Menu.Item key="settings" icon={<SettingOutlined />}>
        <Link href="/settings">Настройки профиля</Link>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} danger onClick={handleLogout}>
        Выйти
      </Menu.Item>
    </Menu>
  );

  return (
    <>
      <Card className="mb-8 bg-gray-50" bordered={false}>
        <div className="flex justify-between items-center flex-wrap">
          <div className="mb-4 md:mb-0 flex items-center">
            <div className="mr-3 text-blue-600">
              <ToolOutlined style={{ fontSize: '28px' }} />
            </div>
            <div>
              <Link href="/">
                <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                  <span style={{ fontWeight: 800 }}>Universal</span>
                  <span style={{ fontWeight: 500 }}>Tools.pro</span>
                </Title>
              </Link>
              <Text type="secondary">Многофункциональный сервис для работы с файлами</Text>
            </div>
          </div>
          <div className="flex space-x-4">
            <Button 
              href="/" 
              type={isActive('/') ? "primary" : "text"}
            >
              Главная
            </Button>
            <Button 
              href="/downloads" 
              type={isActive('/downloads') ? "primary" : "text"}
            >
              Мои загрузки
            </Button>
            <Button 
              href="/converter" 
              type={isActive('/converter') ? "primary" : "text"}
            >
              Конвертер
            </Button>
            <Button 
              href="/pdf" 
              type={isActive('/pdf') ? "primary" : "text"}
            >
              PDF
            </Button>
            
            {isAuthenticated() ? (
              <Dropdown overlay={profileMenu} trigger={['click']}>
                <Button 
                  type={isActive('/profile') ? "primary" : "text"}
                >
                  <Space>
                    <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                    {user?.username || 'Профиль'}
                    <DownOutlined />
                  </Space>
                </Button>
              </Dropdown>
            ) : (
              <Space>
                <Button type="text" onClick={showAuthModal}>
                  Войти
                </Button>
                <Button type="primary" onClick={showAuthModal}>
                  Регистрация
                </Button>
              </Space>
            )}
          </div>
        </div>
      </Card>
      
      <AuthModal visible={authModalVisible} onCancel={hideAuthModal} />
    </>
  );
};

export default NavBar; 