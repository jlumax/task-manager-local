import type { CustomThemePalette } from '@/types';

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_BACKGROUND_EDGE = 1920;
const SAMPLE_EDGE = 64;

type Rgb = { r: number; g: number; b: number };

function toHex({ r, g, b }: Rgb) {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
}

function rgbToHsl({ r, g, b }: Rgb) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
    if (max === green) hue = (blue - red) / delta + 2;
    if (max === blue) hue = (red - green) / delta + 4;
    hue /= 6;
  }

  return { h: hue * 360, s: saturation * 100, l: lightness * 100 };
}

function hsl(h: number, s: number, l: number) {
  return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;
}

function hexToRgb(value: string): Rgb {
  const normalized = /^#[0-9a-f]{6}$/i.test(value) ? value.slice(1) : '476e5e';
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

export function createRefinedCustomPalette(dominant: string): CustomThemePalette {
  const base = rgbToHsl(hexToRgb(dominant));
  const hue = base.s < 8 ? 155 : base.h;
  const saturation = base.s < 8 ? 26 : Math.min(52, Math.max(28, base.s * 0.72));

  return {
    dominant,
    foreground: '#232825',
    card: 'rgba(252, 251, 248, 0.93)',
    cardForeground: '#232825',
    border: 'rgba(35, 40, 37, 0.20)',
    primary: hsl(hue, saturation, 36),
    primaryForeground: '#ffffff',
    muted: '#5e6a64',
    accent: `hsla(${Math.round(hue)}, ${Math.round(saturation)}%, 36%, 0.13)`,
    overlay: 'rgba(244, 246, 243, 0.62)',
  };
}

function getPalette(data: Uint8ClampedArray): CustomThemePalette {
  const buckets = new Map<string, { count: number; r: number; g: number; b: number; score: number }>();
  let pixelCount = 0;

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 160) continue;
    const rgb = { r: data[index], g: data[index + 1], b: data[index + 2] };
    const { s, l } = rgbToHsl(rgb);
    const key = `${rgb.r >> 4}-${rgb.g >> 4}-${rgb.b >> 4}`;
    const existing = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0, score: 0 };
    existing.count += 1;
    existing.r += rgb.r;
    existing.g += rgb.g;
    existing.b += rgb.b;
    existing.score += 1 + (s / 100) * 0.55 - (l < 5 || l > 96 ? 0.45 : 0);
    buckets.set(key, existing);
    pixelCount += 1;
  }

  if (!pixelCount) throw new Error('无法从该图片中提取颜色');

  const dominantBucket = [...buckets.values()].sort((a, b) => b.score - a.score)[0];
  const dominant = toHex({
    r: dominantBucket.r / dominantBucket.count,
    g: dominantBucket.g / dominantBucket.count,
    b: dominantBucket.b / dominantBucket.count,
  });

  return createRefinedCustomPalette(dominant);
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('图片压缩失败')),
      'image/jpeg',
      0.84,
    );
  });
}

export async function processCustomThemeImage(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('请选择图片文件');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('图片不能超过 20 MB');

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_BACKGROUND_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('当前浏览器无法处理图片');
  context.fillStyle = '#f4f4f2';
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const sample = document.createElement('canvas');
  sample.width = SAMPLE_EDGE;
  sample.height = SAMPLE_EDGE;
  const sampleContext = sample.getContext('2d', { willReadFrequently: true });
  if (!sampleContext) throw new Error('当前浏览器无法分析图片颜色');
  sampleContext.drawImage(canvas, 0, 0, SAMPLE_EDGE, SAMPLE_EDGE);
  const palette = getPalette(sampleContext.getImageData(0, 0, SAMPLE_EDGE, SAMPLE_EDGE).data);
  const image = await blobToDataUrl(await canvasToBlob(canvas));

  return { image, palette };
}

export function isCustomThemePalette(value: unknown): value is CustomThemePalette {
  if (!value || typeof value !== 'object') return false;
  const palette = value as Record<string, unknown>;
  return ['dominant', 'foreground', 'card', 'cardForeground', 'border', 'primary',
    'primaryForeground', 'muted', 'accent', 'overlay'].every((key) => typeof palette[key] === 'string');
}
