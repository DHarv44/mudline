const { app, BrowserWindow } = require('electron');
const path = require('path');

// Lets gamepad-only players hear sound without first touching the keyboard.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true },
  });
  if (process.env.MUDLINE_DEV) win.loadURL('http://localhost:5226');
  else win.loadFile(path.join(__dirname, '../dist/index.html'));
});

app.on('window-all-closed', () => app.quit());
