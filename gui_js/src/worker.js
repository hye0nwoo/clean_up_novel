const { parentPort } = require('worker_threads');
const { createReadStream } = require('fs');
const crypto = require('crypto');

// 디버그 로깅 추가
console.log('[디버그] Worker 스크립트 시작');

if (!parentPort) {
    console.error('[오류] parentPort가 없음');
    process.exit(1);
}

parentPort.on('message', async (data) => {
    try {
        console.log('[디버그] Worker 메시지 수신:', data);
        
        if (!data || !data.filePath) {
            throw new Error('파일 경로가 없습니다.');
        }

        const { filePath, chunkSize = 1024 * 1024 } = data;
        const hash = crypto.createHash('md5');
        
        console.log('[디버그] 파일 해시 계산 시작:', filePath);
        
        const stream = createReadStream(filePath, {
            highWaterMark: chunkSize,
            encoding: null
        });

        for await (const chunk of stream) {
            hash.update(chunk);
        }

        const result = hash.digest('hex');
        console.log('[디버그] 파일 해시 계산 완료:', filePath);
        
        parentPort.postMessage({ error: null, data: result });
    } catch (error) {
        console.error('[오류] Worker 처리 중 오류:', error);
        parentPort.postMessage({ error: error.message, data: null });
    }
}); 