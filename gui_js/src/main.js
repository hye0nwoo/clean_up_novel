const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { findAllFiles, groupSimilarFiles } = require('./cleanup_novel.js');
const fs = require('fs').promises;

// 한글 인코딩 설정
if (process.platform === 'win32') {
    process.env.LANG = 'ko_KR.UTF-8';
    require('child_process').execSync('chcp 65001', { stdio: 'ignore' });
}

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        return { action: 'allow' };
    });

    mainWindow.loadFile('index.html');
}

// IPC 이벤트 핸들러
ipcMain.handle('select-directory', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        });
        return result.canceled ? null : result.filePaths[0];
    } catch (error) {
        console.error('디렉토리 선택 중 오류:', error);
        return null;
    }
});

ipcMain.handle('find-files', async (event, dirPath) => {
    try {
        return await findAllFiles(dirPath);
    } catch (error) {
        console.error('파일 검색 중 오류:', error);
        return [];
    }
});

ipcMain.handle('group-files', async (event, files) => {
    try {
        return await groupSimilarFiles(files);
    } catch (error) {
        console.error('파일 그룹화 중 오류:', error);
        return {};
    }
});

ipcMain.handle('move-duplicates', async (event, { files, keepFile, duplicateDir }) => {
    try {
        await fs.mkdir(duplicateDir, { recursive: true });
        
        for (const file of files) {
            if (file !== keepFile) {
                const targetPath = path.join(duplicateDir, path.basename(file));
                await fs.rename(file, targetPath);
            }
        }
        return true;
    } catch (error) {
        console.error('파일 이동 중 오류:', error);
        return false;
    }
});

app.whenReady().then(() => {
    app.commandLine.appendSwitch('lang', 'ko-KR');
    app.commandLine.appendSwitch('force-default-utf8');
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
}); 