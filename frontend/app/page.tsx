'use client';

import React, { useEffect, useState, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
// Добавляем стили для анимаций
import styles from './page.module.css';

// Импортируем компоненты с использованием dynamic для предотвращения ошибок SSR
const NavBar = dynamic(() => import('@/components/NavBar'), 
  { ssr: false }
);

// Типизированный компонент-обертка для клиентских компонентов
interface ClientOnlyProps {
  children: ReactNode;
}

const ClientOnly: React.FC<ClientOnlyProps> = ({ children }) => {
  const [hasMounted, setHasMounted] = useState(false);
  
  useEffect(() => {
    setHasMounted(true);
  }, []);
  
  if (!hasMounted) {
    return null;
  }
  
  return <>{children}</>;
};

// Улучшенная карточка с анимацией при наведении
const FeatureCard = ({ title, description, icon }: { title: string, description: string, icon: string }) => (
  <div className={`bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${styles.featureCard}`}>
    <div className="mb-4">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto transform transition-transform duration-300 hover:scale-110">
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
    <h3 className="text-xl font-bold mb-2 text-blue-800">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState('login');
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    setIsLoaded(true);
  }, []);
  
  const showRegistrationModal = () => {
    setAuthInitialTab('register');
    setAuthModalVisible(true);
  };
  
  const showLoginModal = () => {
    setAuthInitialTab('login');
    setAuthModalVisible(true);
  };
  
  const hideAuthModal = () => {
    setAuthModalVisible(false);
  };
  
  return (
    <>
      <ClientOnly>
        <NavBar />
      </ClientOnly>
      
      <main className={`flex min-h-screen flex-col items-center ${isLoaded ? styles.fadeIn : ''}`}>
        {/* Hero Section с анимацией */}
        <section className={`w-full bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 text-white py-20 relative overflow-hidden ${styles.heroSection}`}>
          <div className={styles.particles}>
            {[...Array(20)].map((_, i) => (
              <div key={i} className={styles.particle}></div>
            ))}
          </div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <h1 className={`text-5xl md:text-6xl font-bold mb-6 ${styles.slideInDown}`}>
              Универсальные инструменты для работы с медиа
            </h1>
            <p className={`text-xl md:text-2xl mb-8 max-w-3xl mx-auto opacity-90 ${styles.slideInUp}`}>
              Наш сервис предлагает загрузку видео с YouTube, Instagram, TikTok, конвертацию в различные форматы и удобный редактор PDF - всё в одном месте!
            </p>
            {!isAuthenticated() && (
              <div className={`flex flex-col sm:flex-row justify-center gap-4 ${styles.fadeInUp}`}>
                <Button 
                  className="bg-white text-blue-600 hover:bg-gray-100 hover:text-blue-700 px-8 py-3 text-lg font-semibold rounded-lg transform transition-transform hover:scale-105 shadow-lg"
                  onClick={showRegistrationModal}
                >
                  Зарегистрироваться бесплатно
                </Button>
                <Link href="/downloads">
                  <Button className="bg-transparent border-2 border-white hover:bg-white hover:text-blue-600 px-8 py-3 text-lg font-semibold rounded-lg transition-all hover:shadow-lg">
                    Начать загрузку
                  </Button>
                </Link>
              </div>
            )}
            {isAuthenticated() && (
              <div className={`flex justify-center ${styles.fadeInUp}`}>
                <Link href="/downloads">
                  <Button className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold rounded-lg transform transition-transform hover:scale-105 shadow-lg">
                    Перейти к инструментам
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Features Section с анимацией */}
        <section className={`py-20 bg-gray-50 w-full ${styles.featuresSection}`}>
          <div className="container mx-auto px-4">
            <h2 className={`text-4xl font-bold text-center mb-12 text-blue-800 ${styles.fadeInTitle}`}>
              <span className="relative">
                Наши инструменты
                <span className={styles.underline}></span>
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className={styles.featureItem}>
                <FeatureCard 
                  title="Загрузчик видео" 
                  description="YouTube, Instagram, TikTok, Facebook, Twitter и многие другие платформы"
                  icon="📹" 
                />
              </div>
              <div className={styles.featureItem}>
                <FeatureCard 
                  title="Конвертер файлов" 
                  description="Преобразование видео и аудио в различные форматы"
                  icon="🔄" 
                />
              </div>
              <div className={styles.featureItem}>
                <FeatureCard 
                  title="Редактор PDF" 
                  description="Удобные инструменты для работы с PDF-документами"
                  icon="📄" 
                />
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section с анимированными шагами */}
        <section className={`py-20 w-full ${styles.howItWorksSection}`}>
          <div className="container mx-auto px-4">
            <h2 className={`text-4xl font-bold text-center mb-12 text-blue-800 ${styles.fadeInTitle}`}>
              <span className="relative">
                Как это работает
                <span className={styles.underline}></span>
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Линия соединяющая элементы */}
              <div className={`hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-blue-200 ${styles.connectingLine}`}></div>
              
              <div className={`text-center ${styles.stepItem}`}>
                <div className="relative">
                  <div className={`w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-6 shadow-md transition-transform hover:scale-110 z-10 ${styles.stepCircle}`}>
                    <span className="text-2xl font-bold">1</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2 text-blue-800">Выберите инструмент</h3>
                <p className="text-gray-600">Загрузчик видео, конвертер или редактор PDF</p>
              </div>
              <div className={`text-center ${styles.stepItem}`}>
                <div className="relative">
                  <div className={`w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-6 shadow-md transition-transform hover:scale-110 z-10 ${styles.stepCircle}`}>
                    <span className="text-2xl font-bold">2</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2 text-blue-800">Загрузите файл или URL</h3>
                <p className="text-gray-600">Укажите ссылку на видео или загрузите файл для обработки</p>
              </div>
              <div className={`text-center ${styles.stepItem}`}>
                <div className="relative">
                  <div className={`w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-6 shadow-md transition-transform hover:scale-110 z-10 ${styles.stepCircle}`}>
                    <span className="text-2xl font-bold">3</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2 text-blue-800">Получите результат</h3>
                <p className="text-gray-600">Скачайте обработанный файл на свое устройство</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section с анимированным фоном */}
        <section className={`py-20 bg-blue-50 w-full relative overflow-hidden ${styles.ctaSection}`}>
          <div className={styles.ctaBg}></div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className={`text-4xl font-bold mb-6 text-blue-800 ${styles.fadeInUp}`}>Готовы начать?</h2>
            <p className={`text-xl mb-8 max-w-3xl mx-auto text-blue-700 ${styles.fadeInUp}`}>
              Зарегистрируйтесь бесплатно и получите доступ ко всем функциям нашего сервиса прямо сейчас.
            </p>
            {!isAuthenticated() && (
              <Button 
                className={`bg-blue-600 text-white hover:bg-blue-700 px-10 py-4 text-lg font-semibold rounded-lg shadow-lg transform transition-transform hover:scale-105 ${styles.pulseButton}`}
                onClick={showRegistrationModal}
              >
                Создать аккаунт
              </Button>
            )}
            {isAuthenticated() && (
              <Link href="/downloads">
                <Button className={`bg-blue-600 text-white hover:bg-blue-700 px-10 py-4 text-lg font-semibold rounded-lg shadow-lg transform transition-transform hover:scale-105 ${styles.pulseButton}`}>
                  К моим инструментам
                </Button>
              </Link>
            )}
          </div>
        </section>

        {/* Footer с улучшенным стилем */}
        <footer className="bg-gray-900 text-white py-10 w-full">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <p className="opacity-80">© 2025 UniversalTools.pro Все права защищены.</p>
            </div>
          </div>
        </footer>
      </main>
      
      <AuthModal 
        visible={authModalVisible} 
        onCancel={hideAuthModal} 
        initialTab={authInitialTab} 
      />
    </>
  );
} 