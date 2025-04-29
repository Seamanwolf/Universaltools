'use client';

import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, Button, Modal, Form, Input, Select, Tabs, Typography, message, Badge, Space, Divider, List, Avatar } from 'antd';
import { UserOutlined, MessageOutlined, ClockCircleOutlined, CheckCircleOutlined, SendOutlined } from '@ant-design/icons';
import { ticketsAPI } from '@/lib/api';

const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Простой компонент для замены Comment из antd
const Comment = ({ author, avatar, content, datetime }: any) => (
  <div style={{ display: 'flex', marginBottom: '16px' }}>
    <div style={{ marginRight: '12px' }}>{avatar}</div>
    <div>
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{author}</div>
      <div>{content}</div>
      <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>{datetime}</div>
    </div>
  </div>
);

interface Ticket {
  id: number;
  userId: number;
  username: string;
  email: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

interface TicketMessage {
  id: number;
  ticketId: number;
  userId: number;
  isAdmin: boolean;
  message: string;
  createdAt: string;
  attachments?: string[];
}

interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

// Генерация моковых тикетов
const generateMockTickets = (count: number): Ticket[] => {
  return Array.from({ length: count }, (_, i) => {
    const userId = 100 + i;
    const status: Ticket['status'] = i % 4 === 0 ? 'open' : i % 4 === 1 ? 'in_progress' : i % 4 === 2 ? 'resolved' : 'closed';
    const priority: Ticket['priority'] = i % 4 === 0 ? 'high' : i % 4 === 1 ? 'medium' : i % 4 === 2 ? 'low' : 'urgent';
    const category = i % 3 === 0 ? 'technical' : i % 3 === 1 ? 'billing' : 'general';
    
    return {
      id: i + 1,
      userId,
      username: `user${i}`,
      email: `user${i}@example.com`,
      subject: `Проблема с загрузкой видео #${i + 1}`,
      status,
      priority,
      category,
      createdAt: new Date(Date.now() - (i * 3600000 * 24)).toISOString(),
      updatedAt: new Date(Date.now() - (i * 3600000 * 12)).toISOString(),
      messages: [
        {
          id: i * 2 + 1,
          ticketId: i + 1,
          userId,
          isAdmin: false,
          message: `У меня возникла проблема при загрузке видео. Пытаюсь скачать видео с YouTube, но получаю ошибку. Пожалуйста, помогите решить проблему. ID загрузки: ${1000 + i}`,
          createdAt: new Date(Date.now() - (i * 3600000 * 24)).toISOString(),
        },
        ...(i % 2 === 0 ? [{
          id: i * 2 + 2,
          ticketId: i + 1,
          userId: 1, // ID администратора
          isAdmin: true,
          message: 'Спасибо за обращение в службу поддержки. Мы проверили логи вашей загрузки и выявили проблему. Пожалуйста, попробуйте обновить страницу и попробовать снова. Если проблема сохранится, сообщите нам.',
          createdAt: new Date(Date.now() - (i * 3600000 * 18)).toISOString(),
        }] : [])
      ]
    };
  });
};

const SupportTickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [viewingTicket, setViewingTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [isTicketDetailModalVisible, setIsTicketDetailModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0
  });
  const [useMockData, setUseMockData] = useState(false);
  
  // Загрузка тикетов
  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [activeTab, currentPage, pageSize]);
  
  const fetchTickets = async () => {
    try {
      setLoading(true);
      
      if (useMockData) {
        // Используем моковые данные
        const allMockTickets = generateMockTickets(30);
        let filteredTickets = [...allMockTickets];
        
        // Фильтруем тикеты в зависимости от активной вкладки
        if (activeTab !== 'all') {
          filteredTickets = allMockTickets.filter(ticket => ticket.status === activeTab);
        }
        
        // Пагинация
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedTickets = filteredTickets.slice(startIndex, endIndex);
        
        setTickets(paginatedTickets);
        setTotalItems(filteredTickets.length);
      } else {
        let status = '';
        
        // Определяем статус для фильтрации в зависимости от активной вкладки
        if (activeTab === 'open') status = 'open';
        else if (activeTab === 'in_progress') status = 'in_progress';
        else if (activeTab === 'resolved') status = 'resolved';
        else if (activeTab === 'closed') status = 'closed';
        
        try {
          const result = await ticketsAPI.getAllTickets(currentPage, pageSize, status);
          setTickets(result.tickets);
          setTotalItems(result.total);
        } catch (error) {
          console.error('Ошибка при загрузке тикетов, используем моковые данные:', error);
          message.warning('API не доступен, используются тестовые данные');
          setUseMockData(true);
          
          // Используем моковые данные
          const allMockTickets = generateMockTickets(30);
          let filteredTickets = [...allMockTickets];
          
          // Фильтруем тикеты в зависимости от активной вкладки
          if (activeTab !== 'all') {
            filteredTickets = allMockTickets.filter(ticket => ticket.status === activeTab);
          }
          
          // Пагинация
          const startIndex = (currentPage - 1) * pageSize;
          const endIndex = startIndex + pageSize;
          const paginatedTickets = filteredTickets.slice(startIndex, endIndex);
          
          setTickets(paginatedTickets);
          setTotalItems(filteredTickets.length);
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке тикетов:', error);
      message.error('Не удалось загрузить тикеты');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchStats = async () => {
    try {
      if (useMockData) {
        calculateMockStats();
      } else {
        try {
          const ticketStats = await ticketsAPI.getTicketStats();
          setStats(ticketStats);
        } catch (error) {
          console.error('Ошибка при загрузке статистики, используем расчет из моковых данных:', error);
          calculateMockStats();
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке статистики:', error);
    }
  };
  
  const calculateMockStats = () => {
    // Генерируем полный набор тикетов для расчета статистики
    const allMockTickets = generateMockTickets(30);
    
    // Расчет статистики
    const openCount = allMockTickets.filter(t => t.status === 'open').length;
    const inProgressCount = allMockTickets.filter(t => t.status === 'in_progress').length;
    const resolvedCount = allMockTickets.filter(t => t.status === 'resolved').length;
    const closedCount = allMockTickets.filter(t => t.status === 'closed').length;
    
    setStats({
      total: allMockTickets.length,
      open: openCount,
      inProgress: inProgressCount,
      resolved: resolvedCount,
      closed: closedCount
    });
  };
  
  // Открытие модального окна с деталями тикета
  const handleViewTicket = async (ticket: Ticket) => {
    try {
      if (!useMockData) {
        // Загружаем полную информацию о тикете, включая все сообщения
        try {
          const fullTicket = await ticketsAPI.getTicketById(ticket.id);
          setViewingTicket(fullTicket);
        } catch (error) {
          console.error('Ошибка при загрузке деталей тикета, используем имеющиеся данные:', error);
          setViewingTicket(ticket);
        }
      } else {
        // Для моковых данных просто используем существующий тикет
        setViewingTicket(ticket);
      }
      
      setIsTicketDetailModalVisible(true);
    } catch (error) {
      console.error('Ошибка при загрузке деталей тикета:', error);
      message.error('Не удалось загрузить детали тикета');
    }
  };
  
  // Отправка ответа на тикет
  const handleSendReply = async () => {
    if (!replyText.trim() || !viewingTicket) return;
    
    try {
      setSendingReply(true);
      
      let updatedTicket: Ticket;
      
      if (!useMockData) {
        updatedTicket = await ticketsAPI.replyToTicket(viewingTicket.id, replyText);
      } else {
        // Создаем новое сообщение
        const newMessage: TicketMessage = {
          id: Date.now(),
          ticketId: viewingTicket.id,
          userId: 1, // ID администратора
          isAdmin: true,
          message: replyText,
          createdAt: new Date().toISOString(),
        };
        
        // Обновляем тикет
        updatedTicket = {
          ...viewingTicket,
          messages: [...viewingTicket.messages, newMessage],
          status: 'in_progress',
          updatedAt: new Date().toISOString()
        };
      }
      
      // Обновляем тикет в списке
      setTickets(tickets.map(t => t.id === viewingTicket.id ? updatedTicket : t));
      setViewingTicket(updatedTicket);
      
      // Очищаем поле ввода
      setReplyText('');
      
      message.success('Ответ отправлен');
      fetchStats(); // Обновляем статистику
    } catch (error) {
      console.error('Ошибка при отправке ответа:', error);
      message.error('Не удалось отправить ответ');
    } finally {
      setSendingReply(false);
    }
  };
  
  // Обновление статуса тикета
  const handleUpdateTicketStatus = async (newStatus: Ticket['status']) => {
    if (!viewingTicket) return;
    
    try {
      setSendingReply(true);
      
      let updatedTicket: Ticket;
      
      if (!useMockData) {
        updatedTicket = await ticketsAPI.updateTicketStatus(viewingTicket.id, newStatus);
      } else {
        // Создаем системное сообщение об изменении статуса
        const systemMessage: TicketMessage = {
          id: Date.now(),
          ticketId: viewingTicket.id,
          userId: 1, // ID администратора
          isAdmin: true,
          message: `Статус тикета изменен на "${getStatusName(newStatus)}"`,
          createdAt: new Date().toISOString(),
        };
        
        // Обновляем тикет
        updatedTicket = {
          ...viewingTicket,
          messages: [...viewingTicket.messages, systemMessage],
          status: newStatus,
          updatedAt: new Date().toISOString()
        };
      }
      
      // Обновляем состояние
      setTickets(tickets.map(t => t.id === viewingTicket.id ? updatedTicket : t));
      setViewingTicket(updatedTicket);
      
      message.success(`Статус тикета изменен на "${getStatusName(newStatus)}"`);
      fetchStats(); // Обновляем статистику
    } catch (error) {
      console.error('Ошибка при обновлении статуса:', error);
      message.error('Не удалось обновить статус тикета');
    } finally {
      setSendingReply(false);
    }
  };
  
  const getStatusName = (status: Ticket['status']) => {
    const statusNames = {
      open: 'открыт',
      in_progress: 'в работе',
      resolved: 'решен',
      closed: 'закрыт'
    };
    return statusNames[status];
  };
  
  // Обработка изменения страницы
  const handlePageChange = (page: number, pageSize?: number) => {
    setCurrentPage(page);
    if (pageSize) {
      setPageSize(pageSize);
    }
  };
  
  // Рендер статуса тикета
  const renderTicketStatus = (status: Ticket['status']) => {
    switch (status) {
      case 'open':
        return <Tag color="red">Открыт</Tag>;
      case 'in_progress':
        return <Tag color="blue">В работе</Tag>;
      case 'resolved':
        return <Tag color="green">Решен</Tag>;
      case 'closed':
        return <Tag color="gray">Закрыт</Tag>;
      default:
        return null;
    }
  };
  
  // Рендер приоритета тикета
  const renderTicketPriority = (priority: Ticket['priority']) => {
    switch (priority) {
      case 'urgent':
        return <Tag color="red">Срочный</Tag>;
      case 'high':
        return <Tag color="orange">Высокий</Tag>;
      case 'medium':
        return <Tag color="blue">Средний</Tag>;
      case 'low':
        return <Tag color="green">Низкий</Tag>;
      default:
        return null;
    }
  };
  
  // Форматирование даты
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  // Столбцы для таблицы тикетов
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
    },
    {
      title: 'Тема',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
    },
    {
      title: 'Пользователь',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: Ticket['status']) => renderTicketStatus(status),
    },
    {
      title: 'Приоритет',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: Ticket['priority']) => renderTicketPriority(priority),
    },
    {
      title: 'Дата создания',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDate(date),
    },
    {
      title: 'Обновлено',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => formatDate(date),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Ticket) => (
        <Button type="primary" onClick={() => handleViewTicket(record)}>
          Просмотр
        </Button>
      ),
    },
  ];
  
  return (
    <div className="support-tickets">
      {useMockData && (
        <div style={{ marginBottom: '16px' }}>
          <Tag color="warning">Используются тестовые данные, так как API недоступен</Tag>
        </div>
      )}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={<span>Все тикеты <Badge count={stats.total} /></span>} key="all" />
          <TabPane 
            tab={<span>Открытые <Badge count={stats.open} style={{ backgroundColor: '#ff4d4f' }} /></span>} 
            key="open" 
          />
          <TabPane 
            tab={<span>В работе <Badge count={stats.inProgress} style={{ backgroundColor: '#1890ff' }} /></span>} 
            key="in_progress" 
          />
          <TabPane 
            tab={<span>Решенные <Badge count={stats.resolved} style={{ backgroundColor: '#52c41a' }} /></span>} 
            key="resolved" 
          />
          <TabPane 
            tab={<span>Закрытые <Badge count={stats.closed} style={{ backgroundColor: '#d9d9d9' }} /></span>} 
            key="closed" 
          />
        </Tabs>
        
        <Table 
          columns={columns} 
          dataSource={tickets}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: totalItems,
            onChange: handlePageChange,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
          }}
        />
      </Card>
      
      {/* Модальное окно с деталями тикета */}
      <Modal
        title={`Тикет #${viewingTicket?.id}: ${viewingTicket?.subject}`}
        open={isTicketDetailModalVisible}
        onCancel={() => setIsTicketDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {viewingTicket && (
          <div>
            <div className="ticket-header">
              <div className="ticket-info">
                <p><strong>Статус:</strong> {renderTicketStatus(viewingTicket.status)}</p>
                <p><strong>Приоритет:</strong> {renderTicketPriority(viewingTicket.priority)}</p>
                <p><strong>Категория:</strong> {viewingTicket.category}</p>
                <p><strong>Пользователь:</strong> {viewingTicket.username} ({viewingTicket.email})</p>
                <p><strong>Создан:</strong> {formatDate(viewingTicket.createdAt)}</p>
              </div>
              
              <div className="ticket-actions">
                <Space>
                  <Button 
                    type="primary" 
                    disabled={viewingTicket.status === 'in_progress'}
                    onClick={() => handleUpdateTicketStatus('in_progress')}
                  >
                    Взять в работу
                  </Button>
                  <Button 
                    type="primary" 
                    disabled={viewingTicket.status === 'resolved'}
                    onClick={() => handleUpdateTicketStatus('resolved')}
                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  >
                    Отметить как решенный
                  </Button>
                  <Button 
                    disabled={viewingTicket.status === 'closed'}
                    onClick={() => handleUpdateTicketStatus('closed')}
                  >
                    Закрыть
                  </Button>
                </Space>
              </div>
            </div>
            
            <Divider />
            
            <div className="ticket-conversation">
              <List
                itemLayout="vertical"
                dataSource={viewingTicket.messages}
                renderItem={message => (
                  <List.Item>
                    <Comment
                      author={message.isAdmin ? 'Администратор' : viewingTicket.username}
                      avatar={
                        <Avatar 
                          icon={<UserOutlined />} 
                          style={{ backgroundColor: message.isAdmin ? '#1890ff' : '#f56a00' }} 
                        />
                      }
                      content={<div style={{ whiteSpace: 'pre-wrap' }}>{message.message}</div>}
                      datetime={formatDate(message.createdAt)}
                    />
                  </List.Item>
                )}
              />
            </div>
            
            <Divider />
            
            {viewingTicket.status !== 'closed' && (
              <div className="ticket-reply">
                <Form layout="vertical">
                  <Form.Item label="Ваш ответ:">
                    <TextArea 
                      rows={4} 
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Введите ваш ответ..."
                    />
                  </Form.Item>
                  <Form.Item>
                    <Button 
                      type="primary" 
                      icon={<SendOutlined />}
                      onClick={handleSendReply}
                      loading={sendingReply}
                      disabled={!replyText.trim()}
                    >
                      Отправить ответ
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            )}
          </div>
        )}
      </Modal>
      
      <style jsx>{`
        .ticket-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .ticket-info {
          flex: 1;
        }
        .ticket-conversation {
          margin: 16px 0;
        }
      `}</style>
    </div>
  );
};

export default SupportTickets; 