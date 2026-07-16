import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const logoPath = path.join(projectRoot, 'public/icons/logo-source.png');
const outputPath = path.join(projectRoot, 'public/og-image.png');

async function generateOgImage() {
  const width = 1200;
  const height = 630;
  
  // Load the logo
  const logo = await sharp(logoPath)
    .resize(400, 400, { fit: 'inside' })
    .toBuffer();
  
  const logoMeta = await sharp(logo).metadata();
  
  // Create white background and composite logo centered
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([
    {
      input: logo,
      left: Math.round((width - logoMeta.width) / 2),
      top: Math.round((height - logoMeta.height) / 2)
    }
  ])
  .png()
  .toFile(outputPath);
  
  console.log(`Generated OG image: ${outputPath}`);
}

generateOgImage().catch(console.error);
