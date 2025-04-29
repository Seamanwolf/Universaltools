'use client';

import React, { useState } from 'react';
import { 
  Layout, 
  Typography, 
  Form, 
  Upload, 
  Button, 
  Select,
  Card,
  Divider,
  List,
  Space,
  message,
  Progress,
  Alert
} from 'antd';
import { 
  UploadOutlined, 
  FileOutlined, 
  CheckCircleOutlined,
  InfoCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import ClientOnly from '@/components/ClientOnly';
import dynamic from 'next/dynamic';

const NavBar = dynamic(() => import('@/components/NavBar'), { ssr: false });

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

// Интерфейс для файла конвертации
interface ConversionFile extends UploadFile {
  progress?: number;
  conversionStatus?: 'waiting' | 'converting' | 'completed' | 'failed';
  convertedUrl?: string;
}

const ConverterPage = () => {
  const [form] = Form.useForm();
  const [files, setFiles] = useState<ConversionFile[]>([]);
  const [converting, setConverting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [outputFormat, setOutputFormat] = useState('mp4');

  // Функция для обработки загрузки файлов
  const handleUpload = ({ fileList }: { fileList: UploadFile[] }) => {
    setFiles(fileList as ConversionFile[]);
  };

  // Функция для запуска конвертации
  const handleStartConversion = async () => {
    if (files.length === 0) {
      message.error('Пожалуйста, добавьте файлы для конвертации');
      return;
    }

    // Имитация процесса конвертации
    setConverting(true);
    
    const updatedFiles = [...files].map(file => ({
      ...file,
      conversionStatus: 'converting',
      progress: 0
    })) as ConversionFile[];
    
    setFiles(updatedFiles);

    for (let i = 0; i < updatedFiles.length; i++) {
      for (let progress = 0; progress <= 100; progress += 5) {
        await new Promise(resolve => setTimeout(resolve, 200));
        updatedFiles[i].progress = progress;
        setFiles([...updatedFiles]);
      }
      
      updatedFiles[i].conversionStatus = 'completed';
      updatedFiles[i].convertedUrl = `https://example.com/converted/file-${i}.${outputFormat}`;
      setFiles([...updatedFiles]);
    }
    
    setConverting(false);
    setShowResult(true);
    message.success('Конвертация успешно завершена');
  };

  // Функция для очистки списка файлов
  const handleClearFiles = () => {
    setFiles([]);
    setShowResult(false);
  };

  // Функция для сохранения настроек конвертации
  const handleSaveSettings = (values: any) => {
    setOutputFormat(values.outputFormat);
    message.success('Настройки конвертации сохранены');
  };

  return (
    <>
      <ClientOnly>
        <NavBar />
      </ClientOnly>
      
      <div className="flex min-h-screen flex-col items-center">
        <div className="container mx-auto px-4 py-8">
          <Title className="text-center mb-6">Конвертер видео и аудио</Title>
          <Paragraph className="text-center mb-8">
            Загрузите файлы для конвертации в другие форматы. 
            Поддерживаются видео и аудиоформаты.
          </Paragraph>
          
          <Card className="mb-8">
            <Dragger
              multiple
              fileList={files}
              beforeUpload={() => false}
              onChange={handleUpload}
              disabled={converting}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">
                Нажмите или перетащите файлы в эту область
              </p>
              <p className="ant-upload-hint">
                Поддерживаются видео (MP4, AVI, MOV, MKV) и аудио (MP3, WAV, FLAC) форматы
              </p>
            </Dragger>
            
            {files.length > 0 && (
              <div className="mt-4">
                <Text strong>Выбрано файлов: {files.length}</Text>
                <List
                  dataSource={files}
                  renderItem={(file) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<FileOutlined />}
                        title={file.name}
                        description={
                          file.conversionStatus === 'converting' ? (
                            <Progress percent={file.progress} status="active" />
                          ) : file.conversionStatus === 'completed' ? (
                            <Space>
                              <CheckCircleOutlined style={{ color: '#52c41a' }} />
                              <Text type="success">Конвертация завершена</Text>
                            </Space>
                          ) : file.conversionStatus === 'failed' ? (
                            <Text type="danger">Ошибка конвертации</Text>
                          ) : (
                            <Text type="secondary">Ожидание</Text>
                          )
                        }
                      />
                      {file.conversionStatus === 'completed' && (
                        <Button type="link" href={file.convertedUrl} target="_blank">
                          Скачать
                        </Button>
                      )}
                    </List.Item>
                  )}
                />
              </div>
            )}
          </Card>
          
          <div className="flex justify-between flex-wrap gap-4">
            <Card title="Настройки конвертации" className="mb-6 flex-1 min-w-[300px]">
              <Form
                form={form}
                layout="vertical"
                initialValues={{ outputFormat: 'mp4', quality: 'high' }}
                onFinish={handleSaveSettings}
              >
                <Form.Item 
                  name="outputFormat" 
                  label="Формат конвертации"
                  rules={[{ required: true, message: 'Выберите формат' }]}
                >
                  <Select onChange={(value) => setOutputFormat(value)}>
                    <Option value="mp4">MP4</Option>
                    <Option value="mp3">MP3</Option>
                    <Option value="avi">AVI</Option>
                    <Option value="mkv">MKV</Option>
                    <Option value="webm">WebM</Option>
                    <Option value="wav">WAV</Option>
                    <Option value="flac">FLAC</Option>
                  </Select>
                </Form.Item>
                
                <Form.Item 
                  name="quality" 
                  label="Качество"
                  rules={[{ required: true, message: 'Выберите качество' }]}
                >
                  <Select>
                    <Option value="low">Низкое</Option>
                    <Option value="medium">Среднее</Option>
                    <Option value="high">Высокое</Option>
                    <Option value="original">Оригинальное</Option>
                  </Select>
                </Form.Item>
                
                <Form.Item 
                  name="keepMetadata" 
                  valuePropName="checked"
                >
                  <Checkbox>Сохранить метаданные</Checkbox>
                </Form.Item>
                
                <Form.Item>
                  <Button type="primary" htmlType="submit" icon={<SettingOutlined />}>
                    Применить настройки
                  </Button>
                </Form.Item>
              </Form>
            </Card>
            
            <Card title="Информация" className="mb-6 flex-1 min-w-[300px]">
              <Alert
                message="Совет по конвертации"
                description="Лучшее качество достигается при конвертации из форматов с минимальными потерями. 
                            MP4 и MP3 обеспечивают хороший баланс между качеством и размером файла."
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
                className="mb-4"
              />
              
              <Paragraph>
                <Text strong>Поддерживаемые форматы:</Text>
              </Paragraph>
              
              <ul className="mb-4">
                <li>Видео: MP4, AVI, MOV, MKV, WebM</li>
                <li>Аудио: MP3, WAV, FLAC, AAC, OGG</li>
              </ul>
              
              <Paragraph>
                <Text strong>Максимальный размер файла:</Text> 500 МБ
              </Paragraph>
              
              <Paragraph>
                <Text strong>Ограничения бесплатной версии:</Text> до 5 файлов в день
              </Paragraph>
            </Card>
          </div>
          
          <div className="mt-6 text-center">
            <Space size="large">
              <Button
                type="primary"
                size="large"
                onClick={handleStartConversion}
                loading={converting}
                disabled={files.length === 0}
              >
                {converting ? 'Конвертация...' : 'Начать конвертацию'}
              </Button>
              
              <Button
                size="large"
                onClick={handleClearFiles}
                disabled={converting || files.length === 0}
              >
                Очистить список
              </Button>
            </Space>
          </div>
          
          {showResult && (
            <Card title="Результаты конвертации" className="mt-8">
              <Paragraph>
                Все файлы были успешно сконвертированы. Вы можете скачать их сейчас
                или перейти в раздел "Мои загрузки" для доступа к ним позже.
              </Paragraph>
              
              <Button type="primary" href="/downloads">
                Перейти к загрузкам
              </Button>
            </Card>
          )}
        </div>
      </div>
    </>
  );
};

const Checkbox = ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => {
  return (
    <label className="ant-checkbox-wrapper">
      <span className="ant-checkbox">
        <input type="checkbox" className="ant-checkbox-input" {...props} />
        <span className="ant-checkbox-inner"></span>
      </span>
      <span>{children}</span>
    </label>
  );
};

export default ConverterPage; 