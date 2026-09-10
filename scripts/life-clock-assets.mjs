import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
const base = new URL('../life-clock/', import.meta.url);
const icon = await readFile(new URL('icon.svg', base));
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) await writeFile(new URL(name, base), await sharp(icon).resize(size, size).png().toBuffer());
const maskable = Buffer.from(icon.toString().replace('rx="112"', 'rx="0"').replace('<circle cx="256"', '<g transform="translate(51.2 51.2) scale(.8)"><circle cx="256"').replace('</svg>', '</g></svg>'));
await writeFile(new URL('icon-maskable.png', base), await sharp(maskable).png().toBuffer());
// A typographic social card: no external images, fonts, or private user values.
const ogp = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="1200" height="675" fill="#df3528"/><rect x="50" y="50" width="1100" height="575" rx="32" fill="#ffe257"/><text x="100" y="145" font-family="Arial" font-size="22" font-weight="bold" letter-spacing="5" fill="#242420">WAKUWAKU FIRE / TIME IS YOUR ASSET</text><text x="94" y="330" font-family="Yu Gothic,Meiryo,sans-serif" font-size="106" font-weight="bold" fill="#242420">FIRE人生時計</text><text x="100" y="430" font-family="Yu Gothic,Meiryo,sans-serif" font-size="53" font-weight="bold" fill="#242420">残りの人生、どう使う？</text><text x="100" y="560" font-family="Yu Gothic,Meiryo,sans-serif" font-size="26" fill="#242420">時間・お金・体験。あなたの人生残高を見える化。</text></svg>`);
await writeFile(new URL('ogp.png', base), await sharp(ogp).png().toBuffer());
console.log('Generated 4 PWA icons and 1200 × 675 OGP.');
