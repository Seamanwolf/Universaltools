import { Download } from '@/types';

interface DownloadStatsProps {
  downloads: Download[];
}

export function DownloadStats({ downloads }: DownloadStatsProps) {
  const total = downloads.length;
  const completed = downloads.filter(d => d.status === 'completed').length;
  const failed = downloads.filter(d => d.status === 'failed').length;
  const inProgress = downloads.filter(d => d.status === 'processing' || d.status === 'pending').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-medium text-gray-900">Всего</h3>
        <p className="text-3xl font-bold text-gray-900">{total}</p>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-medium text-green-600">Завершено</h3>
        <p className="text-3xl font-bold text-green-600">{completed}</p>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-medium text-yellow-600">В процессе</h3>
        <p className="text-3xl font-bold text-yellow-600">{inProgress}</p>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-medium text-red-600">Ошибки</h3>
        <p className="text-3xl font-bold text-red-600">{failed}</p>
      </div>
    </div>
  );
} 