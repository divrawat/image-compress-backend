import sharp from 'sharp';
import multer from 'multer';
import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';

const app = express();
const PORT = 8000;

app.use(cors());
app.use('/compressed', express.static('compressed'));

const upload = multer({ dest: 'uploads/' });

app.post('/api/compress', upload.single('image'), async (req, res) => {
  const inputPath = req.file.path;
  const outputFilename = `compressed-${Date.now()}.jpg`;
  const outputPath = path.join('compressed', outputFilename);

  const { quality, scale } = req.body;

  try {
    const metadata = await sharp(inputPath).metadata();

    const scaleFactor = parseFloat(scale) / 100;
    const newWidth = Math.round(metadata.width * scaleFactor);
    const newHeight = Math.round(metadata.height * scaleFactor);

    const compressedBuffer = await sharp(inputPath)
      .resize({ width: newWidth, height: newHeight })
      .jpeg({ quality: parseInt(quality) || 60 })
      .toBuffer();

    const compressedDir = path.join(process.cwd(), 'compressed');
    if (!fs.existsSync(compressedDir)) {
      fs.mkdirSync(compressedDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, compressedBuffer);

    const { width, height } = await sharp(compressedBuffer).metadata();
    const stats = fs.statSync(outputPath);

    res.json({
      url: `http://localhost:${PORT}/compressed/${outputFilename}`,
      size: (stats.size / 1024).toFixed(2),
      width,
      height,
    });

    fs.unlinkSync(inputPath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Compression failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
