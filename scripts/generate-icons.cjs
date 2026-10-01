const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const publicDir = path.resolve(__dirname, '../apps/web/public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Favicon SVG
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#282723" />
      <stop offset="100%" stop-color="#141311" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FBBF24" />
      <stop offset="50%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
    <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FAF8F5" />
      <stop offset="100%" stop-color="#E2DDD5" />
    </linearGradient>
  </defs>
  
  <!-- Outer rounded square -->
  <rect x="32" y="32" width="448" height="448" rx="112" fill="url(#bgGrad)" stroke="#3D3A34" stroke-width="6" />
  
  <!-- Inner ledger container -->
  <rect x="96" y="96" width="320" height="320" rx="24" fill="#1C1B18" stroke="#2E2C27" stroke-width="3" />
  
  <!-- Ledger vertical spine accent -->
  <rect x="136" y="128" width="28" height="256" rx="10" fill="url(#goldGrad)" />
  
  <!-- Ledger horizontal rows / entries -->
  <rect x="188" y="148" width="188" height="24" rx="6" fill="url(#lineGrad)" />
  <rect x="188" y="196" width="152" height="20" rx="5" fill="#8E887E" opacity="0.9" />
  <rect x="188" y="238" width="188" height="24" rx="6" fill="url(#lineGrad)" />
  <rect x="188" y="286" width="136" height="20" rx="5" fill="#8E887E" opacity="0.9" />
  
  <!-- Checkmark / seal of completed work -->
  <circle cx="356" cy="336" r="28" fill="url(#goldGrad)" />
  <path d="M344 336 L352 344 L368 328" fill="none" stroke="#1C1B18" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg, 'utf8');

// Pure JS PNG Generator helper
function createPNG(width, height, drawPixel) {
  const rowSize = 1 + width * 4;
  const buffer = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    buffer[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixel(x / width, y / height, x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      buffer[pixelOffset] = Math.min(255, Math.max(0, Math.round(r)));
      buffer[pixelOffset + 1] = Math.min(255, Math.max(0, Math.round(g)));
      buffer[pixelOffset + 2] = Math.min(255, Math.max(0, Math.round(b)));
      buffer[pixelOffset + 3] = Math.min(255, Math.max(0, Math.round(a)));
    }
  }
  const compressed = zlib.deflateSync(buffer, { level: 9 });

  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c >>> 0;
  }
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const typeAndData = Buffer.concat([typeBuf, data]);
    const crcVal = crc32(typeAndData);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([lenBuf, typeAndData, crcBuf]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// Draw renderer for Ledgr Icon
function renderLedgrIcon(isMaskable) {
  return function(u, v) {
    const nx = (u - 0.5) * 2;
    const ny = (v - 0.5) * 2;

    if (isMaskable) {
      // Solid background for full maskable area
      const bgGrad = 1 - ny * 0.2;
      let r = 28 * bgGrad;
      let g = 27 * bgGrad;
      let b = 24 * bgGrad;

      // Inner ledger structure (scaled to fit within safe zone)
      const sx = nx / 0.75;
      const sy = ny / 0.75;

      if (Math.abs(sx) < 0.75 && Math.abs(sy) < 0.75) {
        // Spine
        if (sx >= -0.6 && sx <= -0.4 && sy >= -0.55 && sy <= 0.55) {
          return [245, 158, 11, 255]; // Amber gold
        }
        // Row 1
        if (sx >= -0.25 && sx <= 0.6 && sy >= -0.45 && sy <= -0.3) {
          return [245, 242, 235, 255];
        }
        // Row 2
        if (sx >= -0.25 && sx <= 0.4 && sy >= -0.15 && sy <= -0.02) {
          return [142, 136, 126, 255];
        }
        // Row 3
        if (sx >= -0.25 && sx <= 0.6 && sy >= 0.12 && sy <= 0.27) {
          return [245, 242, 235, 255];
        }
        // Badge
        const bdx = sx - 0.45;
        const bdy = sy - 0.45;
        if (Math.hypot(bdx, bdy) < 0.2) {
          return [217, 119, 6, 255];
        }
      }
      return [r, g, b, 255];
    } else {
      // Standard icon with rounded corners
      const cornerRadius = 0.35;
      const qx = Math.max(0, Math.abs(nx) - (1 - cornerRadius));
      const qy = Math.max(0, Math.abs(ny) - (1 - cornerRadius));
      const cornerDist = Math.hypot(qx, qy);

      if (cornerDist > cornerRadius) {
        return [0, 0, 0, 0]; // Transparent outside rounded rect
      }

      // Border highlight
      const edge = Math.max(Math.abs(nx), Math.abs(ny));
      const isBorder = cornerDist > cornerRadius - 0.04 || edge > 0.94;

      const bgFactor = 1 - ny * 0.25;
      let r = isBorder ? 60 : 28 * bgFactor;
      let g = isBorder ? 56 : 27 * bgFactor;
      let b = isBorder ? 50 : 24 * bgFactor;

      // Spine
      if (nx >= -0.55 && nx <= -0.35 && ny >= -0.5 && ny <= 0.5) {
        return [245, 158, 11, 255];
      }
      // Row 1
      if (nx >= -0.2 && nx <= 0.55 && ny >= -0.42 && ny <= -0.28) {
        return [245, 242, 235, 255];
      }
      // Row 2
      if (nx >= -0.2 && nx <= 0.35 && ny >= -0.15 && ny <= -0.03) {
        return [142, 136, 126, 255];
      }
      // Row 3
      if (nx >= -0.2 && nx <= 0.55 && ny >= 0.1 && ny <= 0.24) {
        return [245, 242, 235, 255];
      }
      // Check seal
      const bdx = nx - 0.42;
      const bdy = ny - 0.42;
      if (Math.hypot(bdx, bdy) < 0.18) {
        return [217, 119, 6, 255];
      }

      return [r, g, b, 255];
    }
  };
}

// Generate PNGs
const icon192 = createPNG(192, 192, renderLedgrIcon(false));
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);

const icon512 = createPNG(512, 512, renderLedgrIcon(false));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);

const maskable192 = createPNG(192, 192, renderLedgrIcon(true));
fs.writeFileSync(path.join(publicDir, 'icon-maskable-192.png'), maskable192);

const maskable512 = createPNG(512, 512, renderLedgrIcon(true));
fs.writeFileSync(path.join(publicDir, 'icon-maskable-512.png'), maskable512);

const appleTouch = createPNG(180, 180, renderLedgrIcon(false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);

// Simple favicon.ico (32x32 PNG inside ICO container)
function createIco(pngBuffer) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(32, 0);
  dirEntry.writeUInt8(32, 1);
  dirEntry.writeUInt8(0, 2);
  dirEntry.writeUInt8(0, 3);
  dirEntry.writeUInt16LE(1, 4);
  dirEntry.writeUInt16LE(32, 6);
  dirEntry.writeUInt32LE(pngBuffer.length, 8);
  dirEntry.writeUInt32LE(22, 12);

  return Buffer.concat([header, dirEntry, pngBuffer]);
}

const favicon32 = createPNG(32, 32, renderLedgrIcon(false));
const icoBuffer = createIco(favicon32);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);

console.log('Successfully generated all PWA icon assets in', publicDir);
