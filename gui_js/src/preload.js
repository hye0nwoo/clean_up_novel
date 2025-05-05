const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

console.log('[디버그] Preload 스크립트 로딩 시작');

// API 정의
const electronAPI = {
    path: {
        basename: (filepath) => path.basename(filepath),
        dirname: (filepath) => path.dirname(filepath)
    },
    ipcRenderer: {
        invoke: async (channel, ...args) => {
            const validChannels = [
                'select-directory',
                'find-files',
                'group-files',
                'move-duplicates',
                'get-series-info'
            ];
            if (validChannels.includes(channel)) {
                console.log(`[디버그] IPC 호출: ${channel}`, args);
                const result = await ipcRenderer.invoke(channel, ...args);
                console.log(`[디버그] IPC 결과: ${channel}`, result);
                return result;
            }
            throw new Error(`Unauthorized IPC channel: ${channel}`);
        },
        on: (channel, func) => {
            const validChannels = ['progress-update'];
            if (validChannels.includes(channel)) {
                console.log(`[디버그] IPC 이벤트 리스너 등록: ${channel}`);
                const subscription = (event, ...args) => {
                    console.log(`[디버그] IPC 이벤트 수신: ${channel}`, args);
                    func(...args);
                };
                ipcRenderer.on(channel, subscription);
                return () => {
                    console.log(`[디버그] IPC 이벤트 리스너 제거: ${channel}`);
                    ipcRenderer.removeListener(channel, subscription);
                };
            }
            return undefined;
        }
    }
};

// API 노출
try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    console.log('[디버그] Electron API가 성공적으로 노출됨');
} catch (error) {
    console.error('[오류] Electron API 노출 중 오류:', error.message);
    console.error(error.stack);
} 