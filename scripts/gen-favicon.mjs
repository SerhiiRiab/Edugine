import sharp from 'sharp'
import { writeFileSync } from 'fs'

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#7C3AED"/>
  <text x="258" y="375" font-family="system-ui,-apple-system,sans-serif" font-size="330" font-weight="800" fill="white" text-anchor="middle">E</text>
</svg>`

const svgBuf = Buffer.from(svg)

// apple-touch-icon (180×180 PNG)
await sharp(svgBuf).resize(180, 180).png().toFile('public/apple-touch-icon.png')
console.log('✓ public/apple-touch-icon.png')

// PNG buffers for ICO sizes 16, 32, 48
const sizes = [16, 32, 48]
const pngBufs = await Promise.all(
  sizes.map(s => sharp(svgBuf).resize(s, s).png().toBuffer())
)

// Build ICO binary (PNG-based ICO, valid in all modern browsers)
function buildIco(bufs, dims) {
  const count = bufs.length
  let offset = 6 + count * 16
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)  // reserved
  header.writeUInt16LE(1, 2)  // type: ICO
  header.writeUInt16LE(count, 4)
  const dirs = bufs.map((buf, i) => {
    const d = Buffer.alloc(16)
    d.writeUInt8(dims[i] >= 256 ? 0 : dims[i], 0)
    d.writeUInt8(dims[i] >= 256 ? 0 : dims[i], 1)
    d.writeUInt8(0, 2)   // color count
    d.writeUInt8(0, 3)   // reserved
    d.writeUInt16LE(1, 4)   // planes
    d.writeUInt16LE(32, 6)  // bpp
    d.writeUInt32LE(buf.length, 8)
    d.writeUInt32LE(offset, 12)
    offset += buf.length
    return d
  })
  return Buffer.concat([header, ...dirs, ...bufs])
}

writeFileSync('src/app/favicon.ico', buildIco(pngBufs, sizes))
console.log('✓ src/app/favicon.ico')
