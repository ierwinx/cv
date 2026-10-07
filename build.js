const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (
      entry.name === 'node_modules' ||
      entry.name === '.git' ||
      entry.name === 'dist' ||
      entry.name === '.github'
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy everything to dist
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}

copyDir(__dirname, distDir);

// Minify JS and CSS only when the directories exist
const minifyDirs = [
  { js: 'cv/js', css: 'cv/css' },
  { js: 'assets', css: 'assets' }
];

for (const { js, css } of minifyDirs) {
  const jsDir = path.join(distDir, js);

  if (fs.existsSync(jsDir)) {
    for (const file of fs.readdirSync(jsDir).filter(f => f.endsWith('.js'))) {
      const filePath = path.join(jsDir, file);

      execSync(
        `npx esbuild "${filePath}" --minify --outfile="${filePath}" --allow-overwrite`
      );

      console.log(`Minified: ${js}/${file}`);
    }
  } else {
    console.log(`Skipping JS minification: ${js} does not exist`);
  }

  const cssDir = path.join(distDir, css);

  if (fs.existsSync(cssDir)) {
    for (const file of fs.readdirSync(cssDir).filter(f => f.endsWith('.css'))) {
      const filePath = path.join(cssDir, file);

      execSync(
        `npx csso "${filePath}" --output "${filePath}"`
      );

      console.log(`Minified: ${css}/${file}`);
    }
  } else {
    console.log(`Skipping CSS minification: ${css} does not exist`);
  }
}

console.log('Build complete!');