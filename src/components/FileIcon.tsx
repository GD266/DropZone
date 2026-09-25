import {
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
  FileArchive,
  FileCode,
  File,
} from 'lucide-react';
import { getFileCategory } from '../lib/fileUtils';
import type { FileCategory } from '../types';

interface FileIconProps {
  type: string;
  filename: string;
  size?: number;
  className?: string;
}

const iconColors: Record<FileCategory, string> = {
  image: 'text-emerald-400',
  video: 'text-purple-400',
  audio: 'text-pink-400',
  pdf: 'text-red-400',
  document: 'text-blue-400',
  archive: 'text-amber-400',
  code: 'text-cyan-400',
  generic: 'text-zinc-400',
};

const iconBgColors: Record<FileCategory, string> = {
  image: 'bg-emerald-400/10',
  video: 'bg-purple-400/10',
  audio: 'bg-pink-400/10',
  pdf: 'bg-red-400/10',
  document: 'bg-blue-400/10',
  archive: 'bg-amber-400/10',
  code: 'bg-cyan-400/10',
  generic: 'bg-zinc-400/10',
};

export function FileIcon({ type, filename, size = 20, className = '' }: FileIconProps) {
  const category = getFileCategory(type, filename);
  const colorClass = iconColors[category];
  const bgClass = iconBgColors[category];

  const icons: Record<FileCategory, React.ReactNode> = {
    image: <FileImage size={size} />,
    video: <FileVideo size={size} />,
    audio: <FileAudio size={size} />,
    pdf: <FileText size={size} />,
    document: <FileText size={size} />,
    archive: <FileArchive size={size} />,
    code: <FileCode size={size} />,
    generic: <File size={size} />,
  };

  return (
    <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${bgClass} ${colorClass} ${className}`}>
      {icons[category]}
    </div>
  );
}
