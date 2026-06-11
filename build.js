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
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === '.github') continue;
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy everything to dist
if (fs.existsSync(distDir)) fs.rmSync(distDir, { recursive: true });
copyDir(__dirname, distDir);

// Minify JS files
const jsDir = path.join(distDir, 'js');
const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
for (const file of jsFiles) {
  const filePath = path.join(jsDir, file);
  execSync(`npx esbuild "${filePath}" --minify --outfile="${filePath}" --allow-overwrite`);
  console.log(`Minified: js/${file}`);
}

// Minify CSS files
const cssDir = path.join(distDir, 'css');
const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));
for (const file of cssFiles) {
  const filePath = path.join(cssDir, file);
  execSync(`npx csso "${filePath}" --output "${filePath}"`);
  console.log(`Minified: css/${file}`);
}

console.log('Build complete!');
