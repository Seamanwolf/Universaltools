'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout, Menu, Typography, Avatar, Card, Row, Col, Spin, Button } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  ShoppingOutlined,
  DollarOutlined,
  DownloadOutlined,
  CustomerServiceOutlined,
  MailOutlined,
  ToolOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import UserManagement from '@/components/admin/UserManagement';
import SubscriptionManagement from '@/components/admin/SubscriptionManagement';
import PaymentManagement from '@/components/admin/PaymentManagement';
import DownloadManagement from '@/components/admin/DownloadManagement';
import SupportTickets from '@/components/admin/SupportTickets';
import EmailManagement from '@/components/admin/EmailManagement';
import AdminStats from '@/components/admin/AdminStats';
import { withAdminAuth } from '@/utils/withAdminAuth';
import { useAuth } from '@/contexts/AuthContext';
import ClientOnly from '@/components/ClientOnly';

const { Header, Sider, Content, Footer } = Layout;
const { Title, Text } = Typography;

function AdminPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleMenuClick = (key: string) => {
    setActiveTab(key);
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />;
      case 'subscriptions':
        return <SubscriptionManagement />;
      case 'payments':
        return <PaymentManagement />;
      case 'downloads':
        return <DownloadManagement />;
      case 'tickets':
        return <SupportTickets />;
      case 'email':
        return <EmailManagement />;
      default:
        return <AdminStats />;
    }
  };

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Дашборд',
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: 'Пользователи',
    },
    {
      key: 'subscriptions',
      icon: <ShoppingOutlined />,
      label: 'Подписки',
    },
    {
      key: 'payments',
      icon: <DollarOutlined />,
      label: 'Платежи',
    },
    {
      key: 'downloads',
      icon: <DownloadOutlined />,
      label: 'Загрузки',
    },
    {
      key: 'tickets',
      icon: <CustomerServiceOutlined />,
      label: 'Тикеты',
    },
    {
      key: 'email',
      icon: <MailOutlined />,
      label: 'Почта',
    },
  ];

  return (
    <ClientOnly>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider 
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          style={{
            background: '#fff',
            borderRight: '1px solid #f0f0f0',
          }}
          width={250}
          theme="light"
        >
          <div className="admin-logo" style={{ 
            padding: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderBottom: '1px solid #f0f0f0'
          }}>
            <ToolOutlined style={{ fontSize: '24px', color: '#1890ff', marginRight: collapsed ? 0 : 8 }} />
            {!collapsed && (
              <Title level={5} style={{ margin: 0, color: '#1890ff' }}>
                <span style={{ fontWeight: 800 }}>Universal</span>
                <span style={{ fontWeight: 500 }}>Tools.pro</span>
              </Title>
            )}
          </div>
          
          <Menu
            mode="inline"
            theme="light"
            selectedKeys={[activeTab]}
            items={menuItems}
            onClick={({ key }) => handleMenuClick(key)}
            style={{ borderRight: 0 }}
          />
          
          {!collapsed && (
            <div style={{ 
              padding: '16px',
              borderTop: '1px solid #f0f0f0',
              position: 'absolute',
              bottom: 0,
              width: '100%'
            }}>
              <Link href="/" style={{ display: 'block', marginBottom: '8px' }}>
                <Button type="link" style={{ padding: 0 }}>Вернуться на сайт</Button>
              </Link>
              <Button type="link" danger onClick={handleLogout} style={{ padding: 0 }}>
                <LogoutOutlined /> Выйти
              </Button>
            </div>
          )}
        </Sider>
        
        <Layout>
          <Header style={{ 
            padding: '0 16px', 
            background: '#fff', 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,21,41,.08)',
            height: '64px'
          }}>
            <Title level={4} style={{ margin: 0 }}>
              {activeTab === 'dashboard' && 'Панель управления'}
              {activeTab === 'users' && 'Управление пользователями'}
              {activeTab === 'subscriptions' && 'Управление подписками'}
              {activeTab === 'payments' && 'Управление платежами'}
              {activeTab === 'downloads' && 'Управление загрузками'}
              {activeTab === 'tickets' && 'Поддержка пользователей'}
              {activeTab === 'email' && 'Управление почтой'}
            </Title>
            
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Text style={{ marginRight: '8px' }}>{user?.username}</Text>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
            </div>
          </Header>
          
          <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280 }}>
            {renderContent()}
          </Content>
          
          <Footer style={{ textAlign: 'center', padding: '12px 50px' }}>
            UniversalTools.pro - Панель администратора ©{new Date().getFullYear()}
          </Footer>
        </Layout>
      </Layout>
    </ClientOnly>
  );
}

export default withAdminAuth(AdminPage); 