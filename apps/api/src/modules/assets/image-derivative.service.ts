import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

export type ImageDerivatives = {
  width: number;
  height: number;
  thumb: { buffer: Buffer; contentType: string; ext: string };
  web: { buffer: Buffer; contentType: string; ext: string };
  print: { buffer: Buffer; contentType: string; ext: string };
};

@Injectable()
export class ImageDerivativeService {
  async build(buffer: Buffer): Promise<ImageDerivatives> {
    const meta = await sharp(buffer).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;

    const thumb = await sharp(buffer)
      .rotate()
      .resize({ width: 320, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    const web = await sharp(buffer)
      .rotate()
      .resize({ width: 1280, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    const print = await sharp(buffer)
      .rotate()
      .resize({ width: 2400, withoutEnlargement: true })
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();

    return {
      width,
      height,
      thumb: { buffer: thumb, contentType: 'image/webp', ext: 'webp' },
      web: { buffer: web, contentType: 'image/webp', ext: 'webp' },
      print: { buffer: print, contentType: 'image/jpeg', ext: 'jpg' },
    };
  }
}
