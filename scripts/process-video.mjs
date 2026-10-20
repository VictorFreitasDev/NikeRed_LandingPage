import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Localizar binário do FFmpeg
function findFfmpeg() {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  // Tentar comando direto do PATH
  try {
    const res = spawnSync('ffmpeg', ['-version']);
    if (res.status === 0) return 'ffmpeg';
  } catch {}

  // Tentar caminhos comuns no Windows (WinGet / Scoop / Chocolatey / LocalAppData)
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

  throw new Error(
    'FFmpeg não encontrado. Certifique-se de que o FFmpeg está instalado ou defina a variável FFMPEG_PATH.'
  );
}

// 2. Localizar vídeo de entrada
function findInputVideo() {
  const customArg = process.argv[2];
  if (customArg && fs.existsSync(path.resolve(rootDir, customArg))) {
    return path.resolve(rootDir, customArg);
  }

  const files = fs.readdirSync(rootDir);
  const mp4Files = files.filter((f) => f.endsWith('.mp4'));
  if (mp4Files.length > 0) {
    // Preferir arquivo contendo 'sneakers' ou 'Man_walking'
    const matched = mp4Files.find((f) => f.toLowerCase().includes('sneakers') || f.toLowerCase().includes('walking')) || mp4Files[0];
    return path.resolve(rootDir, matched);
  }

  return null;
}

async function main() {
  console.log('🚀 Iniciando script de processamento de vídeo para WebP...');

  const ffmpegBin = findFfmpeg();
  console.log(`✓ FFmpeg detectado em: ${ffmpegBin}`);

  const inputVideo = findInputVideo();
  if (!inputVideo) {
    console.warn('⚠️ Nenhum vídeo .mp4 encontrado na raiz.');
    console.log('Coloque seu arquivo de vídeo na raiz do projeto e execute:');
    console.log('  npm run process-video <nome-do-video.mp4>');
    process.exit(1);
  }

  console.log(`✓ Vídeo selecionado: ${path.basename(inputVideo)}`);

  // Diretórios de saída
  const publicDir = path.join(rootDir, 'public');
  const framesDir = path.join(publicDir, 'frames');
  const desktopDir = path.join(framesDir, 'desktop');
  const mobileDir = path.join(framesDir, 'mobile');

  fs.mkdirSync(desktopDir, { recursive: true });
  fs.mkdirSync(mobileDir, { recursive: true });

  // Obter metadados com ffprobe
  const ffprobeBin = ffmpegBin.replace(/ffmpeg(?:\.exe)?$/i, 'ffprobe$1');
  let meta = { width: 1920, height: 1080, fps: 24, duration: 9.96, frameCount: 239 };

  try {
    const probeRes = spawnSync(ffprobeBin, [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,r_frame_rate,nb_frames,duration',
      '-of', 'json',
      inputVideo,
    ]);
    if (probeRes.status === 0) {
      const probeJson = JSON.parse(probeRes.stdout.toString());
      const s = probeJson.streams?.[0];
      if (s) {
        meta.width = s.width || 1920;
        meta.height = s.height || 1080;
        if (s.r_frame_rate) {
          const [num, den] = s.r_frame_rate.split('/').map(Number);
          if (den) meta.fps = Math.round(num / den);
        }
        if (s.nb_frames) meta.frameCount = parseInt(s.nb_frames, 10);
        if (s.duration) meta.duration = parseFloat(s.duration);
      }
    }
  } catch (err) {
    console.log('Aviso ao consultar ffprobe, usando valores padrão:', err.message);
  }

  console.log(`✓ Metadados: ${meta.width}x${meta.height}, ${meta.fps} FPS, ${meta.frameCount} frames, ${meta.duration}s`);

  // Configurações de exportação
  // Desktop: 1440x810 (16:9), WebP q:v 76
  // Mobile: 720x1280 (9:16 vertical crop centrado no pé/ação), WebP q:v 75
  const desktopWidth = 1440;
  const desktopHeight = 810;
  const mobileWidth = 720;
  const mobileHeight = 1280;

  console.log('\n[1/3] Extraindo frames para Desktop (1440x810 WebP)...');
  const desktopCmd = [
    '-i', inputVideo,
    '-vf', `scale=${desktopWidth}:${desktopHeight}:flags=lanczos`,
    '-c:v', 'libwebp',
    '-quality', '76',
    '-compression_level', '4',
    '-fps_mode', 'passthrough',
    path.join(desktopDir, 'frame_%03d.webp'),
    '-y',
  ];

  const resDesktop = spawnSync(ffmpegBin, desktopCmd, { stdio: 'inherit' });
  if (resDesktop.status !== 0) {
    throw new Error('Falha ao exportar frames de desktop.');
  }

  console.log('\n[2/3] Extraindo frames para Mobile (720x1280 9:16 WebP)...');
  // Crop vertical centrado e dimensionado
  const mobileFilter = `crop=w=ih*9/16:h=ih:x=(iw-ow)/2:y=0,scale=${mobileWidth}:${mobileHeight}:flags=lanczos`;
  const mobileCmd = [
    '-i', inputVideo,
    '-vf', mobileFilter,
    '-c:v', 'libwebp',
    '-quality', '74',
    '-compression_level', '4',
    '-fps_mode', 'passthrough',
    path.join(mobileDir, 'frame_%03d.webp'),
    '-y',
  ];

  const resMobile = spawnSync(ffmpegBin, mobileCmd, { stdio: 'inherit' });
  if (resMobile.status !== 0) {
    throw new Error('Falha ao exportar frames de mobile.');
  }

  // Contar frames realmente gerados
  const desktopFiles = fs.readdirSync(desktopDir).filter((f) => f.endsWith('.webp') && f.startsWith('frame_'));
  const actualFrameCount = desktopFiles.length;

  console.log(`\n✓ Frames gerados com sucesso: ${actualFrameCount} frames.`);

  // Gerar posters ultraleves (primeiro frame e frame final)
  console.log('\n[3/3] Criando posters iniciais e finais...');
  if (desktopFiles.length > 0) {
    fs.copyFileSync(path.join(desktopDir, desktopFiles[0]), path.join(desktopDir, 'poster.webp'));
    fs.copyFileSync(path.join(desktopDir, desktopFiles[desktopFiles.length - 1]), path.join(desktopDir, 'poster-final.webp'));
  }
  const mobileFiles = fs.readdirSync(mobileDir).filter((f) => f.endsWith('.webp') && f.startsWith('frame_'));
  if (mobileFiles.length > 0) {
    fs.copyFileSync(path.join(mobileDir, mobileFiles[0]), path.join(mobileDir, 'poster.webp'));
    fs.copyFileSync(path.join(mobileDir, mobileFiles[mobileFiles.length - 1]), path.join(mobileDir, 'poster-final.webp'));
  }

  // Salvar manifesto
  const manifest = {
    videoSource: path.basename(inputVideo),
    frameCount: actualFrameCount,
    fps: meta.fps,
    duration: meta.duration,
    desktop: {
      width: desktopWidth,
      height: desktopHeight,
      aspectRatio: desktopWidth / desktopHeight,
      folder: 'frames/desktop',
      pattern: 'frame_%03d.webp',
      poster: 'frames/desktop/poster.webp',
      posterFinal: 'frames/desktop/poster-final.webp',
    },
    mobile: {
      width: mobileWidth,
      height: mobileHeight,
      aspectRatio: mobileWidth / mobileHeight,
      folder: 'frames/mobile',
      pattern: 'frame_%03d.webp',
      poster: 'frames/mobile/poster.webp',
      posterFinal: 'frames/mobile/poster-final.webp',
    },
    generatedAt: new Date().toISOString(),
  };

  const manifestPath = path.join(framesDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`✓ Manifesto salvo em: ${path.relative(rootDir, manifestPath)}`);

  console.log('\n✨ Processamento finalizado com sucesso!');
}

main().catch((err) => {
  console.error('\n❌ Erro no processamento:', err);
  process.exit(1);
});

