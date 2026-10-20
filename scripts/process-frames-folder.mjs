import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function findFfmpeg() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  const localAppData = process.env.LOCALAPPDATA || '';
  const searchBases = [
    path.join(localAppData, 'Microsoft', 'WinGet', 'Packages'),
    'C:\\Program Files\\ffmpeg\\bin',
    'C:\\ffmpeg\\bin',
  ];
  for (const base of searchBases) {
    if (fs.existsSync(base)) {
      try {
        const files = fs.readdirSync(base, { recursive: true });
        for (const f of files) {
          if (typeof f === 'string' && f.endsWith('ffmpeg.exe')) {
            const fullPath = path.join(base, f);
            if (fs.existsSync(fullPath)) return fullPath;
          }
        }
      } catch {}
    }
  }
  return 'ffmpeg';
}

function getSortedUserFrames(folderPath) {
  const files = fs.readdirSync(folderPath);
  const imageFiles = files.filter((f) => /\.(png|jpe?g|webp)$/i.test(f));

  // Ordenar numericamente extraindo o número do nome do arquivo
  return imageFiles.sort((a, b) => {
    const matchA = a.match(/frame_?(\d+)/i);
    const matchB = b.match(/frame_?(\d+)/i);
    const numA = matchA ? parseInt(matchA[1], 10) : 0;
    const numB = matchB ? parseInt(matchB[1], 10) : 0;
    return numA - numB;
  });
}

async function main() {
  const userFramesDir = path.join(rootDir, 'frames');
  if (!fs.existsSync(userFramesDir)) {
    console.error('Pasta frames não encontrada na raiz.');
    process.exit(1);
  }

  const sortedFiles = getSortedUserFrames(userFramesDir);
  console.log(`✓ Encontrados ${sortedFiles.length} frames na pasta frames/:`);
  console.log(`  Primeiro: ${sortedFiles[0]}`);
  console.log(`  Último:   ${sortedFiles[sortedFiles.length - 1]}`);

  const ffmpegBin = findFfmpeg();
  console.log(`✓ FFmpeg detectado em: ${ffmpegBin}`);

  const publicFramesDir = path.join(rootDir, 'public', 'frames');
  const desktopDir = path.join(publicFramesDir, 'desktop');
  const mobileDir = path.join(publicFramesDir, 'mobile');

  // Limpar frames antigos
  fs.rmSync(desktopDir, { recursive: true, force: true });
  fs.rmSync(mobileDir, { recursive: true, force: true });
  fs.mkdirSync(desktopDir, { recursive: true });
  fs.mkdirSync(mobileDir, { recursive: true });

  console.log('\n[1/2] Convertendo frames para Desktop (1440x810 WebP)...');
  for (let i = 0; i < sortedFiles.length; i++) {
    const inputFile = path.join(userFramesDir, sortedFiles[i]);
    const padded = String(i + 1).padStart(3, '0');
    const outputFile = path.join(desktopDir, `frame_${padded}.webp`);

    spawnSync(ffmpegBin, [
      '-i', inputFile,
      '-vf', 'scale=1440:810:flags=lanczos',
      '-c:v', 'libwebp',
      '-quality', '82',
      outputFile,
      '-y',
    ]);
  }

  console.log('\n[2/2] Convertendo frames para Mobile (720x1280 9:16 WebP)...');
  for (let i = 0; i < sortedFiles.length; i++) {
    const inputFile = path.join(userFramesDir, sortedFiles[i]);
    const padded = String(i + 1).padStart(3, '0');
    const outputFile = path.join(mobileDir, `frame_${padded}.webp`);

    // Crop vertical 9:16 centrado no tênis
    const filter = 'crop=w=ih*9/16:h=ih:x=(iw-ow)/2:y=0,scale=720:1280:flags=lanczos';
    spawnSync(ffmpegBin, [
      '-i', inputFile,
      '-vf', filter,
      '-c:v', 'libwebp',
      '-quality', '80',
      outputFile,
      '-y',
    ]);
  }

  // Posters
  fs.copyFileSync(path.join(desktopDir, 'frame_001.webp'), path.join(desktopDir, 'poster.webp'));
  const lastPadded = String(sortedFiles.length).padStart(3, '0');
  fs.copyFileSync(path.join(desktopDir, `frame_${lastPadded}.webp`), path.join(desktopDir, 'poster-final.webp'));

  fs.copyFileSync(path.join(mobileDir, 'frame_001.webp'), path.join(mobileDir, 'poster.webp'));
  fs.copyFileSync(path.join(mobileDir, `frame_${lastPadded}.webp`), path.join(mobileDir, 'poster-final.webp'));

  // Atualizar manifesto
  const manifest = {
    videoSource: 'frames/*.png',
    frameCount: sortedFiles.length,
    fps: 24,
    duration: (sortedFiles.length / 24).toFixed(2),
    desktop: {
      width: 1440,
      height: 810,
      aspectRatio: 1.7777777777777777,
      folder: 'frames/desktop',
      pattern: 'frame_%03d.webp',
      poster: 'frames/desktop/poster.webp',
      posterFinal: 'frames/desktop/poster-final.webp',
    },
    mobile: {
      width: 720,
      height: 1280,
      aspectRatio: 0.5625,
      folder: 'frames/mobile',
      pattern: 'frame_%03d.webp',
      poster: 'frames/mobile/poster.webp',
      posterFinal: 'frames/mobile/poster-final.webp',
    },
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(path.join(publicFramesDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n✨ Sucesso! ${sortedFiles.length} frames da pasta frames/ foram convertidos e registrados no manifest.json.`);
}

main().catch(console.error);
