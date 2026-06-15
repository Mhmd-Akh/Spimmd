const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 شروع Vite dev server...');
const viteProcess = spawn('npx', ['vite', '--host', 'localhost', '--port', '5173'], {
  stdio: 'inherit',
  shell: true,
});

setTimeout(() => {
  console.log('⚡ اجرای Electron...');
  const electronPath = path.join(__dirname, '../electron-local/electron.exe');
  const projectPath = path.join(__dirname, '..');

  const electronProcess = spawn(electronPath, [projectPath], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
    },
  });

  // 🔥 وقتی Electron بسته شد، Vite رو هم بکش
  electronProcess.on('close', (code) => {
    console.log(`Electron با کد ${code} بسته شد`);
    viteProcess.kill();
    process.exit(code);
  });

  // 🔥 اگه Electron کرش کرد یا بسته نشد، با Ctrl+C هم Vite بسته بشه
  process.on('SIGINT', () => {
    electronProcess.kill();
    viteProcess.kill();
    process.exit();
  });

  process.on('SIGTERM', () => {
    electronProcess.kill();
    viteProcess.kill();
    process.exit();
  });

}, 3000);