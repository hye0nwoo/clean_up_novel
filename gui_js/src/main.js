const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { findAllFiles, groupSimilarFiles, extractVolumeInfo } = require('./cleanup_novel.js');
const fs = require('fs').promises;
const fsSync = require('fs');

// GPU 가속 비활성화
app.disableHardwareAcceleration();

// 앱 시작 전 설정
app.commandLine.appendSwitch('lang', 'ko-KR');
app.commandLine.appendSwitch('force-default-utf8');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-gpu-program-cache');

// GPU 캐시 디렉토리 설정
app.setPath('userData', path.join(app.getPath('temp'), 'electron-cache'));

// Windows 환경에서 한글 인코딩 설정
if (process.platform === 'win32') {
    try {
        // UTF-8 설정
        process.env.LANG = 'ko_KR.UTF-8';
        process.env.LANGUAGE = 'ko_KR.UTF-8';
        process.env.LC_ALL = 'ko_KR.UTF-8';
        
        // Windows 콘솔 코드페이지 설정
        const { execSync } = require('child_process');
        execSync('chcp 65001', { stdio: 'ignore' });
    } catch (error) {
        // console.error('[오류] 인코딩 설정 중 오류:', error);
    }
}

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true
        },
        show: false,
        backgroundColor: '#ffffff'
    });

    // Content-Security-Policy 설정
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; worker-src 'self'"
                ]
            }
        });
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        return { action: 'allow' };
    });

    mainWindow.loadFile(path.join(__dirname, '../index.html'));
    
    // 개발 도구 열기 (디버깅용)
    // mainWindow.webContents.openDevTools();

    // 창이 준비되면 포커스
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// 디렉토리 선택 다이얼로그
ipcMain.handle('select-directory', async () => {
    // console.log('[디버그] 디렉토리 선택 다이얼로그 열기');
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        });
        // console.log('[디버그] 선택된 디렉토리:', result.filePaths[0]);
        return result.filePaths[0];
    } catch (error) {
        // console.error('[오류] 디렉토리 선택 중 오류:', error);
        throw error;
    }
});

// 파일 검색
ipcMain.handle('find-files', async (event, dirPath) => {
    // console.log('[디버그] 파일 검색 시작. 경로:', dirPath);
    try {
        if (!dirPath) {
            // console.log('[디버그] 디렉토리 경로가 없음');
            return [];
        }

        const progressCallback = (progress) => {
            mainWindow.webContents.send('progress-update', {
                ...progress,
                type: 'search'
            });
        };

        const files = await findAllFiles(dirPath, progressCallback);
        // console.log('[디버그] 검색 완료. 파일 수:', files.length);
        return files;
    } catch (error) {
        // console.error('[오류] 파일 검색 중 오류:', error);
        throw error;
    }
});

// 파일 그룹화
ipcMain.handle('group-files', async (event, files) => {
    // console.log('[디버그] 파일 그룹화 시작. 파일 수:', files.length);
    try {
        if (!Array.isArray(files) || files.length === 0) {
            // console.log('[디버그] 그룹화할 파일이 없음');
            return {};
        }

        const progressCallback = (progress) => {
            mainWindow.webContents.send('progress-update', {
                ...progress,
                type: 'group'
            });
        };

        const groups = await groupSimilarFiles(files, progressCallback);
        const groupCount = Object.keys(groups).length;

        if (groupCount === 0) {
            // console.log('[디버그] 중복 파일이 없음');
            mainWindow.webContents.send('progress-update', {
                type: 'group',
                status: '중복 파일 없음',
                current: files.length,
                total: files.length,
                percent: 100,
                details: '중복된 파일이 발견되지 않았습니다.'
            });
        } else {
            // console.log(`[디버그] ${groupCount}개의 중복 그룹 발견`);
            mainWindow.webContents.send('progress-update', {
                type: 'group',
                status: '그룹화 완료',
                current: files.length,
                total: files.length,
                percent: 100,
                details: `${groupCount}개의 중복 그룹 발견됨`
            });
        }

        return groups;
    } catch (error) {
        // console.error('[오류] 파일 그룹화 중 오류:', error);
        mainWindow.webContents.send('progress-update', {
            type: 'group',
            status: '오류 발생',
            current: 0,
            total: files.length,
            percent: 0,
            details: `오류: ${error.message}`
        });
        throw error;
    }
});

// 중복 파일 이동
ipcMain.handle('move-duplicates', async (event, { files, keepFile, duplicateDir }) => {
    // console.log('중복 파일 이동 시작');
    try {
        // 원본 파일이 있는 디렉토리에 duplicates 폴더 생성
        const originalDir = path.dirname(keepFile);
        const duplicatesPath = path.join(originalDir, duplicateDir);
        
        // console.log('[디버그] 중복 파일 이동 정보:');
        // console.log('- 유지할 파일:', keepFile);
        // console.log('- 이동할 폴더:', duplicatesPath);
        
        await fs.mkdir(duplicatesPath, { recursive: true });
        
        for (const file of files) {
            if (file !== keepFile) {
                const fileName = path.basename(file);
                const targetPath = path.join(duplicatesPath, fileName);
                
                // 이미 같은 이름의 파일이 있는 경우 처리
                let finalPath = targetPath;
                let counter = 1;
                while (fsSync.existsSync(finalPath)) {
                    const ext = path.extname(fileName);
                    const nameWithoutExt = path.basename(fileName, ext);
                    finalPath = path.join(duplicatesPath, `${nameWithoutExt}_${counter}${ext}`);
                    counter++;
                }
                
                // console.log(`[디버그] 파일 이동: ${file} -> ${finalPath}`);
                await fs.rename(file, finalPath);
            }
        }
        
        // console.log('중복 파일 이동 완료');
        return true;
    } catch (error) {
        // console.error('파일 이동 중 오류:', error);
        throw error;
    }
});

ipcMain.handle('get-series-info', async (event, filename) => {
    // console.log('[디버그] 시리즈 정보 요청:', filename);
    try {
        const info = extractVolumeInfo(filename);
        // console.log('[디버그] 시리즈 정보 결과:', info);
        return info;
    } catch (error) {
        // console.error('[오류] 시리즈 정보 추출 중 오류:', error);
        throw error;
    }
});

// 활성화될 때 창이 없으면 새 창 생성
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
}); 