/* Copyright (c) FusionClaw. Licensed under the MIT License. */
// Run with the desktop checkout as argv[2]. Preserve the exact header cube and
// outline its display font so the SVG is self-contained on every platform.
const fs = require('node:fs');
const path = require('node:path');
const desktop = path.resolve(process.argv[2] || '../fusionclaw');
const fontkit = require(require.resolve('fontkit', { paths: [desktop] }));
const font = fontkit.openSync(path.join(desktop, 'src/renderer/src/assets/fonts/wordmark.woff2'));
const cube = fs.readFileSync(path.join(desktop, 'src/renderer/src/assets/brand/fusionclaw-logo.png')).toString('base64');
let offset = 0;
const scale = 26 / font.unitsPerEm;
const run = font.layout('FUSIONCLAW');
const letters = run.glyphs.map((glyph, index) => {
	const position = run.positions[index];
	const result = `<path transform="translate(${offset + position.xOffset} ${position.yOffset})" d="${glyph.path.toSVG()}"/>`;
	offset += position.xAdvance + .045 * font.unitsPerEm;
	return result;
}).join('');
const output = path.resolve(__dirname, '../../src/vs/workbench/browser/parts/editor/media');
for (const [theme, foreground] of [['dark', '#f3ece7'], ['light', '#122033']]) {
	fs.writeFileSync(path.join(output, `fusionclaw-watermark-${theme}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 64" role="img" aria-label="FusionClaw — Build Beyond Limits">
  <image width="64" height="64" href="data:image/png;base64,${cube}"/>
  <g fill="${foreground}" transform="translate(80 33) scale(${scale} ${-scale})">${letters}</g>
  <text x="80" y="49" font-family="Arial, sans-serif" font-size="10" font-weight="500" letter-spacing="2.5" fill="#399eea">BUILD BEYOND LIMITS</text>
</svg>\n`);
}
