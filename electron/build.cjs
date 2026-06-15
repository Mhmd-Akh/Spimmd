const { execSync } = require('child_process');
const path = require('path');

console.log('🔨 شروع فرآیند build...\n');

// ۱. پاکسازی پوشه‌های قبلی
console.log('🧹 پاکسازی پوشه‌های قبلی...');
try {
  execSync('npx rimraf FINAL_RELEASES dist', { stdio: 'inherit' });
} catch (e) {
  // rimraf نصب نیست، با دستور ویندوز پاک کن
  try {
    execSync('if exist FINAL_RELEASES rmdir /s /q FINAL_RELEASES', { stdio: 'inherit' });
    execSync('if exist dist rmdir /s /q dist', { stdio: 'inherit' });
  } catch (err) {
    console.log('مشکلی در پاکسازی نیست، ادامه می‌دیم...');
  }
}

// ۲. Build ری‌اکت با Vite
console.log('⚛️ Build ری‌اکت با Vite...');
execSync('npx vite build', { stdio: 'inherit' });

// ۳. Build با electron-builder
console.log('📦 Build نهایی با electron-builder...');
execSync('npx electron-builder --config', { stdio: 'inherit' });

console.log('\n✅ Build با موفقیت انجام شد!');
console.log('📁 خروجی در پوشه FINAL_RELEASES');

execSync('npx electron-builder --publish always', { stdio: 'inherit' });