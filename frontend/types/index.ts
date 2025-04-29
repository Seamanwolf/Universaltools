// Типы для пользователя
export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  is_email_verified?: boolean;
  role: UserRole;
  created_at: string;
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

// Типы для подписки
export interface Subscription {
  id: number;
  user_id: number;
  type: SubscriptionType;
  start_date: string;
  end_date?: string;
  downloads_limit?: number;
  downloads_used: number;
  price: number;
  is_active: number;
  created_at: string;
  payment_id?: string;
}

export enum SubscriptionType {
  TRIAL = 'trial',
  ONE_TIME = 'one_time',
  PACK_10 = 'pack_10',
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export interface SubscriptionPlan {
  type: SubscriptionType;
  name: string;
  description: string;
  price: number;
  downloads_limit?: number;
  duration_days?: number;
  features: string[];
}

// Типы для платежей
export interface Payment {
  id: number;
  user_id: number;
  subscription_id: number;
  amount: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  transaction_id?: string;
  created_at: string;
}

export enum PaymentMethod {
  UKASSA_CARD = 'ukassa_card',
  UKASSA_QR = 'ukassa_qr',
  ADMIN_MANUAL = 'admin_manual'
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Типы для видео и скачиваний
export interface VideoInfo {
  video_id: string;
  title: string;
  author: string;
  length_seconds: number;
  thumbnail_url: string;
  formats: VideoFormat[];
  upload_date?: string;
  view_count?: number;
  description?: string;
}

export interface VideoFormat {
  format_id: string;
  format_note: string;
  ext: string;
  resolution: string;
  fps?: number;
  filesize?: number;
  filesize_approx?: number;
}

export interface Download {
  id: number;
  user_id: number;
  subscription_id?: number;
  video_id: string;
  title: string;
  url: string;
  thumbnail: string;
  format: string;
  resolution: string;
  filesize?: number;
  status: string;
  created_at: string;
  file_path?: string;
  download_url?: string;
} 