import React, { useState } from 'react';
import { Tabs, Typography, Card, Button, Input, Alert, Divider, Space, Empty, Row, Col } from 'antd';
import { 
  FileSearchOutlined, 
  LinkOutlined, 
  DownloadOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  YoutubeOutlined,
  FileZipOutlined,
  AudioOutlined,
  SettingOutlined
} from '@ant-design/icons';
import NavBar from '@/components/NavBar';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface Tool {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  color: string;
}

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState('subtitles');
  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<null | { success: boolean; message?: string; data?: any }>(null);

  const tools: Tool[] = [
    {
      id: '1',
      title: 'Загрузка видео',
      description: 'Загрузка видео с YouTube, Vimeo и других популярных видеохостингов в различных форматах и качестве.',
      icon: <YoutubeOutlined />,
      link: '/',
      color: 'bg-red-500'
    },
    {
      id: '2',
      title: 'Извлечение аудио',
      description: 'Извлечение аудио из видеофайлов в форматах MP3, AAC, FLAC и других с настройкой качества.',
      icon: <AudioOutlined />,
      link: '/tools/audio-extract',
      color: 'bg-blue-500'
    },
    {
      id: '3',
      title: 'Конвертация форматов',
      description: 'Конвертация видео в различные форматы, включая MP4, MKV, AVI и другие.',
      icon: <FileZipOutlined />,
      link: '/tools/convert',
      color: 'bg-green-500'
    },
    {
      id: '4',
      title: 'Настройка загрузок',
      description: 'Настройка параметров загрузки, включая ограничение скорости, качество видео и аудио.',
      icon: <SettingOutlined />,
      link: '/tools/settings',
      color: 'bg-purple-500'
    }
  ];

  // Обработчик для проверки URL
  const handleCheckUrl = async () => {
    if (!inputUrl.trim()) return;
    
    setIsLoading(true);
    setResult(null);
    
    try {
      // Имитация запроса API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (inputUrl.includes('youtube.com') || inputUrl.includes('youtu.be')) {
        setResult({
          success: true,
          data: {
            subtitles: [
              { language: 'Русский', format: 'srt', languageCode: 'ru' },
              { language: 'English', format: 'srt', languageCode: 'en' },
              { language: 'Español', format: 'srt', languageCode: 'es' }
            ]
          }
        });
      } else {
        setResult({
          success: false,
          message: 'URL не распознан как YouTube видео. Пожалуйста, проверьте ссылку и попробуйте снова.'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Произошла ошибка при обработке запроса. Пожалуйста, попробуйте позже.'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = () => {
    handleCheckUrl();
  };
  
  const handleReset = () => {
    setInputUrl('');
    setResult(null);
  };
  
  const renderSubtitlesResult = () => {
    if (!result || !result.success || !result.data?.subtitles) return null;
    
    return (
      <div className="mt-6">
        <Alert
          message="Субтитры найдены"
          description={`Найдено ${result.data.subtitles.length} доступных языков субтитров`}
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
        />
        
        <Divider orientation="left">Доступные языки</Divider>
        
        <div className="flex flex-wrap gap-2">
          {result.data.subtitles.map((subtitle: any, index: number) => (
            <Button key={index}>
              Скачать {subtitle.language} ({subtitle.format})
            </Button>
          ))}
        </div>
      </div>
    );
  };
  
  const renderVideoInfo = () => {
    if (!result || !result.success) return null;
    
    return (
      <div className="mt-6">
        <Alert
          message="Информация получена"
          description="Ниже представлена информация о видео"
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
        />
        
        <Card className="mt-4">
          <Space direction="vertical" className="w-full">
            <div>
              <Text strong>Название:</Text>
              <Paragraph>Пример названия видео</Paragraph>
            </div>
            
            <Divider style={{ margin: '8px 0' }} />
            
            <div>
              <Text strong>Автор:</Text>
              <Paragraph>Канал автора</Paragraph>
            </div>
            
            <Divider style={{ margin: '8px 0' }} />
            
            <div>
              <Text strong>Дата публикации:</Text>
              <Paragraph>01.01.2023</Paragraph>
            </div>
            
            <Divider style={{ margin: '8px 0' }} />
            
            <div>
              <Text strong>Просмотры:</Text>
              <Paragraph>1,234,567</Paragraph>
            </div>
            
            <Divider style={{ margin: '8px 0' }} />
            
            <div>
              <Text strong>Длительность:</Text>
              <Paragraph>10:30</Paragraph>
            </div>
          </Space>
        </Card>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col items-center">
      <NavBar />
      
      <div className="w-full">
        <div className="container mx-auto px-4 py-8">
          <Title level={2} className="mb-6">Инструменты</Title>
          <Paragraph className="mb-8">
            Наш сервис предлагает различные инструменты для работы с видео и аудио.
            Выберите нужный инструмент из списка ниже или воспользуйтесь поиском.
          </Paragraph>
          
          <Row gutter={[16, 16]}>
            {tools.map(tool => (
              <Col xs={24} sm={12} md={8} lg={6} key={tool.id}>
                <Card
                  hoverable
                  className="h-full"
                  actions={[
                    <Button type="primary" key="use" href={tool.link}>
                      Использовать
                    </Button>
                  ]}
                >
                  <div className="flex flex-col items-center mb-4">
                    <div className={`rounded-full p-4 ${tool.color} text-white text-2xl mb-2`}>
                      {tool.icon}
                    </div>
                    <Title level={4} className="mb-2 text-center">{tool.title}</Title>
                  </div>
                  <Paragraph className="text-center">{tool.description}</Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
          
          <Card className="mt-8 bg-gray-50">
            <Title level={4} className="mb-2">Нужна помощь?</Title>
            <Paragraph>
              Если вам нужна помощь с использованием инструментов или у вас есть предложения
              по улучшению сервиса, пожалуйста, свяжитесь с нашей службой поддержки.
            </Paragraph>
            <Button type="primary" href="/support">
              Связаться с поддержкой
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
} 