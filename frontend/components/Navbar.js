'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Space } from 'antd';
import { UserOutlined, DownOutlined, LogoutOutlined, SettingOutlined, HistoryOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';

const { Header } = Layout;

const Navbar = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [current, setCurrent] = useState('home');
  const [authModalVisible, setAuthModalVisible] = useState(false);
  
  useEffect(() => {
    // Определяем текущий активный раздел на основе URL
    if (pathname?.startsWith('/downloads')) {
      setCurrent('downloads');
    } else if (pathname?.startsWith('/subscriptions')) {
      setCurrent('subscriptions');
    } else if (pathname?.startsWith('/admin')) {
      setCurrent('admin');
    } else {
      setCurrent('home');
    }
  }, [pathname]);

  const handleMenuClick = (e) => {
    setCurrent(e.key);
  };

  const showAuthModal = () => {
    setAuthModalVisible(true);
  };

  const hideAuthModal = () => {
    setAuthModalVisible(false);
  };

  const items = [
    {
      key: 'home',
      label: <Link href="/">Главная</Link>,
    },
    {
      key: 'downloads',
      label: <Link href="/downloads">Загрузки</Link>,
    },
    {
      key: 'subscriptions',
      label: <Link href="/subscriptions">Подписки</Link>,
    },
  ];

  // Если пользователь - администратор, добавляем пункт меню "Администрирование"
  if (user && user.role === 'admin') {
    items.push({
      key: 'admin',
      label: <Link href="/admin">Администрирование</Link>,
    });
  }

  // Меню для аватара пользователя
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: <Link href="/profile">Профиль</Link>,
    },
    {
      key: 'payments',
      icon: <HistoryOutlined />,
      label: <Link href="/payments">История платежей</Link>,
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: <Link href="/settings">Настройки</Link>,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Выйти',
      onClick: logout,
    },
  ];

  return (
    <>
      <Header style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div className="logo" style={{ width: 120 }}>
          <Link href="/" style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
            YT Downloader
          </Link>
        </div>
        
        <div style={{ flex: 1, display: 'flex' }}>
          <Menu
            theme="dark"
            mode="horizontal"
            selectedKeys={[current]}
            onClick={handleMenuClick}
            items={items}
            style={{ flex: 1 }}
          />
        </div>
        
        <div>
          {user ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <a onClick={(e) => e.preventDefault()}>
                <Space>
                  <Avatar icon={<UserOutlined />} />
                  {user.username}
                  <DownOutlined />
                </Space>
              </a>
            </Dropdown>
          ) : (
            <Space>
              <Button type="link" onClick={showAuthModal}>
                Войти
              </Button>
              <Button type="primary" onClick={showAuthModal}>
                Регистрация
              </Button>
            </Space>
          )}
        </div>
      </Header>
      
      <AuthModal visible={authModalVisible} onCancel={hideAuthModal} />
    </>
  );
};

export default Navbar; 