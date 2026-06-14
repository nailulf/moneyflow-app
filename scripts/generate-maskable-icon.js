// scripts/generate-maskable-icon.js
const sharp = require('sharp')
const path = require('path')

const SRC = path.join(__dirname, '..', 'public', 'icons', 'icon-512x512.png')
const OUT = path.join(__dirname, '..', 'public', 'icons', 'icon-maskable-512.png')
const BRAND = { r: 0x20, g: 0x50, b: 0x7f, alpha: 1 } // #20507F

async function run() {
  // Inner logo occupies ~62% of the canvas → ~19% margin each side (maskable safe zone ≥10%).
  const inner = await sharp(SRC)
    .resize(320, 320, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()
  await sharp({ create: { width: 512, height: 512, channels: 4, background: BRAND } })
    .composite([{ input: inner, gravity: 'center' }])
    .png()
    .toFile(OUT)
  console.log('Wrote', OUT)
}
run().catch((e) => { console.error(e); process.exit(1) })
