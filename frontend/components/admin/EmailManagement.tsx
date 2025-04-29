'use client';

import React, { useState, useEffect } from 'react';
import { Card, Tabs, Typography, Table, Button, Modal, Form, Input, Tag, Space, Tooltip, Badge, Divider } from 'antd';
import { EditOutlined, EyeOutlined, MailOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, SendOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;
const { Title } = Typography;
const { TextArea } = Input;

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  lastModified: string;
}

interface EmailLog {
  id: string;
  recipientEmail: string;
  subject: string;
  sentAt: string;
  status: 'delivered' | 'failed' | 'pending';
}

const EmailManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  
  // Форма для редактирования шаблона
  const [form, setForm] = useState({
    name: '',
    subject: '',
    body: ''
  });
  
  useEffect(() => {
    // Моковые данные для демонстрации
    const mockTemplates: EmailTemplate[] = [
      {
        id: '1',
        name: 'Приветственное письмо',
        subject: 'Добро пожаловать в YouTube Downloader!',
        body: '<h1>Здравствуйте!</h1><p>Благодарим за регистрацию в нашем сервисе. Мы рады приветствовать вас...</p>',
        lastModified: '2023-11-10T10:30:00Z'
      },
      {
        id: '2',
        name: 'Подтверждение email',
        subject: 'Подтвердите ваш email',
        body: '<h1>Подтверждение email</h1><p>Для подтверждения вашего email адреса, пожалуйста, нажмите на кнопку ниже...</p>',
        lastModified: '2023-10-28T14:15:00Z'
      },
      {
        id: '3',
        name: 'Сброс пароля',
        subject: 'Инструкции по сбросу пароля',
        body: '<h1>Сброс пароля</h1><p>Вы запросили сброс пароля. Нажмите на ссылку ниже для создания нового пароля...</p>',
        lastModified: '2023-11-05T09:45:00Z'
      }
    ];
    
    const mockLogs: EmailLog[] = [
      {
        id: '101',
        recipientEmail: 'user1@example.com',
        subject: 'Добро пожаловать в YouTube Downloader!',
        sentAt: '2023-11-12T13:30:00Z',
        status: 'delivered'
      },
      {
        id: '102',
        recipientEmail: 'user2@example.com',
        subject: 'Подтвердите ваш email',
        sentAt: '2023-11-12T12:15:00Z',
        status: 'delivered'
      },
      {
        id: '103',
        recipientEmail: 'user3@example.com',
        subject: 'Инструкции по сбросу пароля',
        sentAt: '2023-11-12T10:45:00Z',
        status: 'failed'
      },
      {
        id: '104',
        recipientEmail: 'user4@example.com',
        subject: 'Добро пожаловать в YouTube Downloader!',
        sentAt: '2023-11-11T15:20:00Z',
        status: 'delivered'
      },
      {
        id: '105',
        recipientEmail: 'user5@example.com',
        subject: 'Подтвердите ваш email',
        sentAt: '2023-11-11T14:10:00Z',
        status: 'pending'
      }
    ];
    
    setTemplates(mockTemplates);
    setLogs(mockLogs);
    
    // Имитация загрузки данных
    setTimeout(() => setLoading(false), 800);
  }, []);
  
  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setForm({
      name: template.name,
      subject: template.subject,
      body: template.body
    });
    setEditMode(true);
    setPreviewMode(false);
  };
  
  const handlePreviewTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setPreviewMode(true);
    setEditMode(false);
  };
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSaveTemplate = () => {
    if (!selectedTemplate) return;
    
    const updatedTemplate: EmailTemplate = {
      ...selectedTemplate,
      name: form.name,
      subject: form.subject,
      body: form.body,
      lastModified: new Date().toISOString()
    };
    
    setTemplates(prev => prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
    setEditMode(false);
    setSelectedTemplate(null);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleOpenMailcowAdmin = () => {
    window.open('https://mail.universaltools.pro/SOGo', '_blank');
  };
  
  // Функция для отображения статуса письма с соответствующим значком
  const renderEmailStatus = (status: EmailLog['status']) => {
    switch (status) {
      case 'delivered':
        return <Tag icon={<CheckCircleOutlined />} color="success">Доставлено</Tag>;
      case 'pending':
        return <Tag icon={<ClockCircleOutlined />} color="processing">В очереди</Tag>;
      case 'failed':
        return <Tag icon={<CloseCircleOutlined />} color="error">Ошибка</Tag>;
      default:
        return null;
    }
  };
  
  if (loading) {
    return (
      <div className="p-4">
        <Card loading={true} />
      </div>
    );
  }
  
  return (
    <div className="p-4">
      <Card 
        title={
          <div className="flex justify-between items-center">
            <span>Управление электронной почтой</span>
            <Button 
              type="primary" 
              icon={<MailOutlined />} 
              onClick={handleOpenMailcowAdmin}
        >
              Панель управления Mailcow
            </Button>
      </div>
        }
        extra={
          <Space>
            <Badge count={logs.filter(log => log.status === 'pending').length}>
              <MailOutlined style={{ fontSize: '18px' }} />
            </Badge>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="Шаблоны писем" key="templates">
          {editMode && selectedTemplate ? (
              <Card title="Редактирование шаблона">
                <Form layout="vertical">
                  <Form.Item label="Название шаблона">
                    <Input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                />
                  </Form.Item>
                  <Form.Item label="Тема письма">
                    <Input
                  name="subject"
                  value={form.subject}
                  onChange={handleFormChange}
                />
                  </Form.Item>
                  <Form.Item label="Содержимое письма (HTML)">
                    <TextArea
                  name="body"
                  value={form.body}
                  onChange={handleFormChange}
                  rows={15}
                    />
                  </Form.Item>
                  <Form.Item>
                    <Space>
                      <Button type="primary" onClick={handleSaveTemplate}>Сохранить</Button>
                      <Button onClick={() => {setEditMode(false); setSelectedTemplate(null);}}>Отмена</Button>
                    </Space>
                  </Form.Item>
                </Form>
              </Card>
          ) : previewMode && selectedTemplate ? (
              <Card title={selectedTemplate.subject}>
                <div dangerouslySetInnerHTML={{ __html: selectedTemplate.body }}></div>
                <Divider />
                <Button onClick={() => {setPreviewMode(false); setSelectedTemplate(null);}}>Назад</Button>
              </Card>
          ) : (
              <Table
                dataSource={templates}
                rowKey="id"
                columns={[
                  {
                    title: 'Название',
                    dataIndex: 'name',
                    key: 'name',
                  },
                  {
                    title: 'Тема письма',
                    dataIndex: 'subject',
                    key: 'subject',
                  },
                  {
                    title: 'Последнее изменение',
                    dataIndex: 'lastModified',
                    key: 'lastModified',
                    render: (text) => formatDate(text)
                  },
                  {
                    title: 'Действия',
                    key: 'actions',
                    render: (_, record) => (
                      <Space>
                        <Button 
                          icon={<EditOutlined />} 
                          onClick={() => handleEditTemplate(record)}
                          type="primary"
                          size="small"
                        >
                          Редактировать
                        </Button>
                        <Button 
                          icon={<EyeOutlined />} 
                          onClick={() => handlePreviewTemplate(record)}
                          size="small"
                        >
                          Просмотр
                        </Button>
                      </Space>
                    )
                  }
                ]}
              />
          )}
          </TabPane>
          
          <TabPane tab="История отправки" key="logs">
            <Table
              dataSource={logs}
              rowKey="id"
              columns={[
                {
                  title: 'Получатель',
                  dataIndex: 'recipientEmail',
                  key: 'recipientEmail',
                },
                {
                  title: 'Тема',
                  dataIndex: 'subject',
                  key: 'subject',
                  ellipsis: true,
                },
                {
                  title: 'Дата отправки',
                  dataIndex: 'sentAt',
                  key: 'sentAt',
                  render: (text) => formatDate(text)
                },
                {
                  title: 'Статус',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status) => renderEmailStatus(status)
                },
                {
                  title: 'Действия',
                  key: 'actions',
                  render: (_, record) => (
                    <Space>
                      <Tooltip title="Отправить повторно">
                        <Button 
                          icon={<SendOutlined />} 
                          disabled={record.status === 'pending'}
                          size="small"
                        />
                      </Tooltip>
                    </Space>
                  )
                }
              ]}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default EmailManagement; 