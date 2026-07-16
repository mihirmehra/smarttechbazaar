import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const splashSizes = [
  { width: 2048, height: 2732 },
  { width: 1668, height: 2388 },
  { width: 1536, height: 2048 },
  { width: 1290, height: 2796 },
  { width: 1179, height: 2556 },
  { width: 1170, height: 2532 },
  { width: 1125, height: 2436 },
  { width: 750, height: 1334 },
];

const logoPath = path.join(__dirname, '../public/icons/logo-source.png');
const outputDir = path.join(__dirname, '../public/splash');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateSplashScreens() {
  console.log('Starting splash screen generation...');
  
  // Get logo metadata
  const logoMeta = await sharp(logoPath).metadata();
  console.log(`Logo size: ${logoMeta.width}x${logoMeta.height}`);

  for (const size of splashSizes) {
    const outputPath = path.join(outputDir, `apple-splash-${size.width}-${size.height}.png`);
    
    // Calculate logo size - logo should be about 30% of the smaller dimension
    const smallerDim = Math.min(size.width, size.height);
    const logoSize = Math.round(smallerDim * 0.35);
    
    // Resize logo
    const resizedLogo = await sharp(logoPath)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .toBuffer();
    
    // Create white background and composite logo in center
    await sharp({
      create: {
        width: size.width,
        height: size.height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .composite([{
        input: resizedLogo,
        gravity: 'center'
      }])
      .png()
      .toFile(outputPath);
    
    console.log(`Created: apple-splash-${size.width}-${size.height}.png`);
  }
  
  console.log('All splash screens generated successfully!');
}

generateSplashScreens().catch(console.error);
