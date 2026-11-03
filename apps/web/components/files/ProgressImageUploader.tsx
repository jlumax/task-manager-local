'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { Upload, X, Loader2, Lock } from 'lucide-react';

interface ProgressImageUploaderProps {
  images: string[];
  uploading: boolean;
  onSelectFiles: (files: File[]) => void;
  onRemove: (index: number) => void;
  imageUploadBlocked?: boolean;
}

export default function ProgressImageUploader({
  images,
  uploading,
  onSelectFiles,
  onRemove,
  imageUploadBlocked,
}: ProgressImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    console.log('ProgressImageUploader handleChange', fileList?.length);
    if (fileList && fileList.length > 0) {
      console.log('files[0]:', fileList[0]?.name, fileList[0]?.type);
      // 立即转数组：FileList 是 live 集合，async 回调恢复后可能已被清空
      const arr = Array.from(fileList);
      e.target.value = ''; // allow re-selecting same file
      onSelectFiles(arr);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden"
        onChange={handleChange}
      />
      {imageUploadBlocked && images.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted">
          <Lock size={14} />
          图片上传是 <Link href="/pricing" className="text-primary hover:underline">Pro 功能</Link>，升级后可使用
        </div>
      ) : images.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted hover:border-primary hover:text-primary transition-colors"
        >
          <Upload size={16} />
          点击选择图片，或直接在上方粘贴/拖拽
        </button>
      ) : (
        <div className="flex flex-wrap gap-2">
          {images.map((url, idx) => (
            <div key={`${url}-${idx}`} className="relative group">
              <img
                src={url}
                alt=""
                className="h-16 w-16 rounded-lg object-cover border border-border"
              />
              {uploading && idx === images.length - 1 && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30">
                  <Loader2 size={14} className="animate-spin text-white" />
                </div>
              )}
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="absolute -right-1 -top-1 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {imageUploadBlocked ? (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border text-muted">
              <Lock size={16} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border text-muted hover:border-primary hover:text-primary transition-colors"
            >
              <Upload size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
