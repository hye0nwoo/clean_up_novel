const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const { promisify } = require('util');
const glob = require('glob');
const cliProgress = require('cli-progress');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');
const iconv = require('iconv-lite');
const { createReadStream } = require('fs');

// Windows 환경에서 콘솔 출력 인코딩 설정
const isElectron = process.versions.electron !== undefined;

if (process.platform === 'win32' && !isElectron) {
    try {
        require('child_process').execSync('chcp 65001', { stdio: 'ignore' });
    } catch (error) {
        console.error('Failed to set console code page:', error);
    }
}

// 사용자 입력을 위한 readline 인터페이스
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = promisify(rl.question).bind(rl);

// 동시 실행 작업 수 설정
const CONCURRENCY = Math.max(1, os.cpus().length - 1);

class WorkerPool {
    constructor(size = Math.max(1, os.cpus().length - 1)) {
        this.size = size;
        this.workers = [];
        this.queue = [];
        console.log('[디버그] Worker Pool 생성. 크기:', size);
    }

    initialize() {
        if (this.workers.length > 0) {
            console.log('[디버그] Worker Pool이 이미 초기화됨');
            return;
        }

        try {
            const workerPath = path.join(__dirname, 'worker.js');
            console.log('[디버그] Worker 스크립트 경로:', workerPath);

            for (let i = 0; i < this.size; i++) {
                const worker = new Worker(workerPath);
                
                worker.on('message', (result) => {
                    console.log('[디버그] Worker 응답 수신:', i, result);
                    this.handleWorkerMessage(result, worker);
                });

                worker.on('error', (error) => {
                    console.error('[오류] Worker 오류:', i, error);
                    this.handleWorkerError(error, worker);
                });

                worker.on('exit', (code) => {
                    if (code !== 0) {
                        console.error('[오류] Worker 비정상 종료:', i, code);
                    }
                });

                this.workers.push({ worker, busy: false, id: i });
                console.log('[디버그] Worker 생성됨:', i);
            }
        } catch (error) {
            console.error('[오류] Worker Pool 초기화 실패:', error);
            throw error;
        }
    }

    handleWorkerMessage(result, sourceWorker) {
        const workerInfo = this.workers.find(w => w.worker === sourceWorker);
        if (!workerInfo) {
            console.error('[오류] 알 수 없는 Worker로부터 메시지 수신');
            return;
        }

        workerInfo.busy = false;
        const currentTask = this.queue[0];

        if (!currentTask) {
            console.error('[오류] 처리할 작업이 없음');
            return;
        }

        if (result.error) {
            console.error('[오류] Worker 작업 실패:', result.error);
            currentTask.reject(new Error(result.error));
        } else {
            console.log('[디버그] Worker 작업 완료:', workerInfo.id);
            currentTask.resolve(result.data);
        }

        this.queue.shift();
        this.processQueue();
    }

    handleWorkerError(error, sourceWorker) {
        console.error('[오류] Worker 오류 발생:', error);
        const workerInfo = this.workers.find(w => w.worker === sourceWorker);
        if (workerInfo) {
            workerInfo.busy = false;
            this.recreateWorker(workerInfo);
        }

        if (this.queue.length > 0) {
            const currentTask = this.queue.shift();
            currentTask.reject(error);
        }

        this.processQueue();
    }

    recreateWorker(workerInfo) {
        try {
            const workerPath = path.join(__dirname, 'worker.js');
            workerInfo.worker.terminate();
            
            const newWorker = new Worker(workerPath);
            newWorker.on('message', (result) => this.handleWorkerMessage(result, newWorker));
            newWorker.on('error', (error) => this.handleWorkerError(error, newWorker));
            
            workerInfo.worker = newWorker;
            workerInfo.busy = false;
            
            console.log('[디버그] Worker 재생성됨:', workerInfo.id);
        } catch (error) {
            console.error('[오류] Worker 재생성 실패:', error);
        }
    }

    processQueue() {
        if (this.queue.length === 0) {
            return;
        }

        const availableWorker = this.workers.find(w => !w.busy);
        if (!availableWorker) {
            return;
        }

        const currentTask = this.queue[0];
        availableWorker.busy = true;

        try {
            console.log('[디버그] 작업 전달:', availableWorker.id, currentTask.filePath);
            availableWorker.worker.postMessage({
                filePath: currentTask.filePath,
                chunkSize: currentTask.chunkSize
            });
        } catch (error) {
            console.error('[오류] 작업 전달 실패:', error);
            availableWorker.busy = false;
            currentTask.reject(error);
            this.queue.shift();
            this.processQueue();
        }
    }

    async processFile(filePath, chunkSize = 1024 * 1024) {
        if (this.workers.length === 0) {
            this.initialize();
        }

        return new Promise((resolve, reject) => {
            this.queue.push({ filePath, chunkSize, resolve, reject });
            this.processQueue();
        });
    }

    terminate() {
        console.log('[디버그] Worker Pool 종료');
        this.workers.forEach(({ worker }) => worker.terminate());
        this.workers = [];
        this.queue = [];
    }
}

// Worker Pool 인스턴스 생성
const workerPool = new WorkerPool();

// 파일 해시 계산 함수
async function calculateFileHash(filePath, chunkSize = 1024 * 1024) {
    try {
        // console.log('[디버그] 파일 해시 계산 시작:', filePath);
        const hash = await workerPool.processFile(filePath, chunkSize);
        // console.log('[디버그] 파일 해시 계산 완료:', filePath);
        return hash;
    } catch (error) {
        // console.error('[오류] 파일 해시 계산 실패:', error);
        throw error;
    }
}

// 파일 처리
async function processFile(filePath) {
    try {
        // console.log('[디버그] 파일 처리 시작:', filePath);
        
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) {
            // console.log('[디버그] 파일이 아님:', filePath);
            return null;
        }

        // 파일 확장자 확인
        const ext = path.extname(filePath).toLowerCase();
        if (ext !== '.txt') {
            // console.log('[디버그] txt 파일이 아님:', filePath);
            return null;
        }

        // 50MB 이상 파일은 건너뛰기
        if (stats.size > 50 * 1024 * 1024) {
            // console.log(`[스킵] 대용량 파일 (${filePath}): ${(stats.size / (1024 * 1024)).toFixed(2)}MB`);
            return null;
        }

        const normalizedName = normalizeFilename(path.parse(filePath).name);
        if (!normalizedName) {
            // console.log('[디버그] 정규화된 파일명이 없음:', filePath);
            return null;
        }

        // console.log('[디버그] 파일 해시 계산 중:', filePath);
        const hash = await calculateFileHash(filePath);
        
        const result = {
            path: filePath,
            normalizedName,
            hash,
            size: stats.size
        };
        
        // console.log('[디버그] 파일 처리 완료:', filePath);
        return result;
    } catch (error) {
        // console.error(`[오류] 파일 처리 중 오류 (${filePath}):`, error);
        return null;
    }
}

// 병렬 처리 함수
async function processInParallel(items, processor, concurrency = CONCURRENCY) {
    const results = [];
    const running = new Set();
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(items.length, 0);

    async function runNext() {
        if (items.length === 0) return;
        const item = items.shift();
        running.add(item);

        try {
            const result = await processor(item);
            results.push(result);
        } catch (error) {
            console.error(`처리 중 오류 발생: ${error.message}`);
        }

        running.delete(item);
        progressBar.increment();
        
        if (items.length > 0) {
            await runNext();
        }
    }

    await Promise.all(
        Array(concurrency).fill().map(() => runNext())
    );

    progressBar.stop();
    return results;
}

// 대용량 파일 처리
async function processLargeFile(filePath, threshold = 100 * 1024 * 1024) { // 100MB 이상
    const stats = await fs.stat(filePath);
    
    if (stats.size >= threshold) {
        const fd = await fs.open(filePath, 'r');
        const hash = crypto.createHash('md5');
        const buffer = Buffer.alloc(1024 * 1024); // 1MB 청크
        
        try {
            let bytesRead;
            let position = 0;
            
            while (position < stats.size) {
                bytesRead = (await fd.read(buffer, 0, buffer.length, position)).bytesRead;
                hash.update(buffer.slice(0, bytesRead));
                position += bytesRead;
            }
            
            return hash.digest('hex');
        } finally {
            await fd.close();
        }
    }
    
    return calculateFileHash(filePath);
}

// Worker Thread에서 실행될 코드
function workerCode() {
    parentPort.on('message', async data => {
        try {
            const { filePath } = data;
            const hash = await calculateFileHash(filePath);
            const stats = await fs.stat(filePath);
            
            parentPort.postMessage({
                path: filePath,
                hash,
                size: stats.size
            });
        } catch (error) {
            parentPort.postMessage({ error: error.message });
        }
    });
}

// 메타데이터 태그 제거
function removeMetadataTags(filename) {
    // [xxx], (xxx), {xxx} 패턴 제거
    let cleaned = filename.replace(/[\[\(\{].*?[\]\)\}]/g, '');
    // 연속된 공백 제거
    cleaned = cleaned.replace(/\s+/g, ' ');
    // 앞뒤 공백 제거
    return cleaned.trim();
}

// 권수 패턴 확인
function isVolumePattern(filename) {
    const volumePatterns = [
        /\d+권.*?완결/,
        /\d+권.*?完/,
        /\d+권/,
        /제\d+권/,
        /\d+부/,
        /[상중하]권/,
        /vol\.\d+/,
        /volume\d+/,
        /\d+-\d+권/,
        /시즌\d+/,
        /season\d+/
    ];
    return volumePatterns.some(pattern => pattern.test(filename.toLowerCase()));
}

// 기본 제목 추출
function getBaseTitle(filename) {
    // 완결 표시 제거
    let base = filename.replace(/\(완결\)|완결|\(完\)|完/, '');
    
    // 권수 표시 패턴 제거
    base = base.replace(/\d+권|\d+부|[상중하]권|vol\.\d+|volume\d+|\d+-\d+권|시즌\d+|season\d+/g, '');
    
    // 남은 숫자와 특수문자 제거
    base = base.replace(/\d+|[^\w\s가-힣]/g, '');
    
    // 연속된 공백 제거
    return base.replace(/\s+/g, ' ').trim();
}

// 시리즈 인식을 위한 패턴
const SERIES_PATTERNS = [
    /(.*?)[\s_-]*(\d+)권/,  // 기본 숫자+권
    /(.*?)[\s_-]*(\d+)-\d+권/,  // 1-1권 형태
    /(.*?)[\s_-]*[제권]\s*(\d+)/,  // 제1권, 권1 형태
    /(.*?)[\s_-]*(상|중|하)편?/,  // 상/중/하 표기
    /(.*?)[\s_-]*(first|second|third|fourth|fifth)/i,  // 영문 표기
    /(.*?)[\s_-]*vol\.?\s*(\d+)/i,  // Vol.1 형태
    /(.*?)[\s_-]*part\.?\s*(\d+)/i,  // Part.1 형태
    /(.*?)[\s_-]*#(\d+)/,  // #1 형태
    /(.*?)[\s_-]*(\d+)화/,  // 1화 형태
    /(.*?)[\s_-]*(\d+)장/,  // 1장 형태
    /(.*?)[\s_-]*(\d+)편/,  // 1편 형태
    /(.*?)[\s_-]*시즌\s*(\d+)/,  // 시즌1 형태
    /(.*?)[\s_-]*season\s*(\d+)/i,  // season1 형태
    /(.*?)[\s_-]*(\d+)(?:\.txt)?$/  // 파일명 끝의 숫자 (확장자 제외)
];

// 시리즈명 정규화
function normalizeSeriesName(title) {
    // 특수문자 및 공백 제거
    let normalized = title.replace(/[\s\-_]+/g, '');
    // 괄호 내용 제거
    normalized = normalized.replace(/[\[\(\{].*?[\]\)\}]/g, '');
    // 시리즈 표시 제거
    normalized = normalized.replace(/시리즈|series/gi, '');
    // 권/화/편 등 제거
    normalized = normalized.replace(/권|화|편|장|part|vol|volume/gi, '');
    // 숫자 제거
    normalized = normalized.replace(/\d+/g, '');
    return normalized.toLowerCase();
}

// 권수 정보 추출
function extractVolumeInfo(filename) {
    for (const pattern of SERIES_PATTERNS) {
        const match = filename.match(pattern);
        if (match) {
            const seriesName = match[1].trim();
            const volumeInfo = match[2];
            
            // 시리즈명이 너무 짧으면 무시
            if (seriesName.length < 2) {
                continue;
            }
            
            return { seriesName, volumeInfo };
        }
    }
    return null;
}

// 권수를 숫자로 변환
function getVolumeNumber(volumeInfo) {
    // 숫자인 경우
    if (/^\d+$/.test(volumeInfo)) {
        return parseInt(volumeInfo);
    }
    
    // 상/중/하 변환
    const volumeMap = { '상': 1, '중': 2, '하': 3 };
    if (volumeInfo in volumeMap) {
        return volumeMap[volumeInfo];
    }
    
    // 영문 변환
    const englishMap = {
        'first': 1, 'second': 2, 'third': 3,
        'fourth': 4, 'fifth': 5
    };
    if (volumeInfo.toLowerCase() in englishMap) {
        return englishMap[volumeInfo.toLowerCase()];
    }
    
    return null;
}

// 연속된 권수 확인
function isSequentialVolumes(volumes) {
    if (volumes.length < 2) {
        return false;
    }
    
    const sortedVols = [...volumes].sort((a, b) => a - b);
    // 1권, 2권, 3권... 패턴
    const sequential = sortedVols.every((vol, i) => 
        i === 0 || sortedVols[i] - sortedVols[i-1] === 1
    );
    // 1권, 10권, 11권... 패턴
    const decimalSequential = sortedVols.every((vol, i) => 
        i === 0 || [1, 9, 10].includes(sortedVols[i] - sortedVols[i-1])
    );
    return sequential || decimalSequential;
}

// 같은 시리즈 확인
function isSameSeries(files) {
    if (files.length < 2) {
        return false;
    }
    
    const seriesInfo = new Map();
    let baseName = null;
    
    for (const file of files) {
        const volumeInfo = extractVolumeInfo(path.parse(file).name);
        if (!volumeInfo) {
            return false;
        }
        
        const { seriesName, volumeInfo: volume } = volumeInfo;
        const normalizedName = normalizeSeriesName(seriesName);
        
        // 첫 번째 파일의 시리즈명을 기준으로 설정
        if (baseName === null) {
            baseName = normalizedName;
        }
        // 다른 파일의 시리즈명이 다르면 시리즈가 아님
        else if (baseName !== normalizedName) {
            return false;
        }
        
        if (!seriesInfo.has(normalizedName)) {
            seriesInfo.set(normalizedName, new Set());
        }
        
        const volumeNum = getVolumeNumber(volume);
        if (volumeNum === null) {
            return false;
        }
        
        seriesInfo.get(normalizedName).add(volumeNum);
    }
    
    // 시리즈가 하나만 있고, 권수가 중복되지 않으며, 연속된 숫자인지 확인
    if (seriesInfo.size === 1) {
        const volumes = seriesInfo.get(baseName);
        if (volumes.size > 1 && volumes.size === files.length) {
            return isSequentialVolumes([...volumes]);
        }
    }
    
    return false;
}

// 파일명 정규화
function normalizeFilename(filename) {
    let cleaned = removeMetadataTags(filename);
    let normalized = cleaned.replace(/[_\-+\s]/g, '');
    
    if (!isVolumePattern(normalized)) {
        normalized = normalized.replace(/\d+|완$|完$/, '');
    }
    
    normalized = normalized.toLowerCase();
    normalized = normalized.replace(/[^\w가-힣]/g, '');
    
    return normalized.trim();
}

// 파일명 키 생성
function getFilenameKey(filename) {
    const normalized = normalizeFilename(filename);
    return normalized.length >= 5 ? normalized.slice(0, 5) : normalized;
}

// 유사도 계산
function calculateSimilarity(str1, str2) {
    const pattern1 = removeMetadataTags(str1);
    const pattern2 = removeMetadataTags(str2);
    
    if (pattern1 === pattern2) return 1.0;
    
    // 기본 문자열이 다르면 다른 패턴
    const base1 = getBaseTitle(pattern1);
    const base2 = getBaseTitle(pattern2);
    
    if (base1 !== base2) return 0.0;
    
    // Levenshtein 거리 기반 유사도 계산
    const maxLength = Math.max(pattern1.length, pattern2.length);
    const distance = levenshteinDistance(pattern1, pattern2);
    return 1 - (distance / maxLength);
}

// Levenshtein 거리 계산
function levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j - 1] + 1,
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1
                );
            }
        }
    }
    return dp[m][n];
}

// 파일 처리 작업자
class FileProcessor {
    constructor(concurrency = CONCURRENCY) {
        this.concurrency = concurrency;
        this.queue = [];
        this.running = 0;
        this.results = [];
        this.onComplete = null;
    }

    async add(file, rootDir) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                file,
                rootDir,
                resolve,
                reject
            });
            this.processNext();
        });
    }

    async processNext() {
        if (this.running >= this.concurrency || this.queue.length === 0) {
            return;
        }

        this.running++;
        const { file, rootDir, resolve, reject } = this.queue.shift();

        try {
            const fullPath = path.join(rootDir, file);
            const normalizedName = normalizeFilename(path.parse(file).name);
            
            if (normalizedName) {
                const hash = await processLargeFile(fullPath);
                const stats = await fs.stat(fullPath);
                
                const result = {
                    path: fullPath,
                    normalizedName,
                    hash,
                    size: stats.size
                };
                
                this.results.push(result);
                resolve(result);
            } else {
                resolve(null);
            }
        } catch (error) {
            reject(error);
        } finally {
            this.running--;
            this.processNext();
            
            if (this.running === 0 && this.queue.length === 0 && this.onComplete) {
                this.onComplete(this.results);
            }
        }
    }

    onCompleted(callback) {
        this.onComplete = callback;
    }
}

// 병렬 파일 처리
async function processFilesInParallel(files, progressCallback, maxConcurrent = os.cpus().length) {
    const results = [];
    const chunks = [];
    const chunkSize = Math.ceil(files.length / maxConcurrent);
    
    // 파일들을 청크로 나누기
    for (let i = 0; i < files.length; i += chunkSize) {
        chunks.push(files.slice(i, i + chunkSize));
    }
    
    // 각 청크를 병렬 처리
    for (const chunk of chunks) {
        const chunkPromises = chunk.map(async file => {
            try {
                const result = await processFile(file);
                if (result) {
                    results.push(result);
                    if (progressCallback) {
                        await progressCallback(file);
                    }
                }
            } catch (error) {
                console.error(`[오류] 파일 처리 중 오류 (${file}):`, error);
            }
        });
        
        await Promise.all(chunkPromises);
    }
    
    return results;
}

// 모든 파일 찾기
async function findAllFiles(rootDir, progressCallback) {
    console.log('[디버그] 파일 검색 시작. 루트 디렉토리:', rootDir);
    
    try {
        // 파일 목록 가져오기
        const pattern = path.join(rootDir, '**', '*.txt');
        console.log('[디버그] 검색 패턴:', pattern);
        
        const files = await new Promise((resolve, reject) => {
            glob(pattern, { nodir: true }, (err, matches) => {
                if (err) {
                    console.error('[오류] 파일 검색 중 오류:', err);
                    reject(err);
                    return;
                }
                resolve(matches);
            });
        });

        if (progressCallback) {
            progressCallback({
                type: 'count',
                total: files.length,
                status: '파일 검색 완료',
                details: `총 ${files.length}개 파일 발견됨`
            });
        }

        // 파일 정보 수집
        const fileInfos = [];
        let processedCount = 0;

        for (const file of files) {
            try {
                const stats = await fs.stat(file);
                if (stats.isFile()) {
                    fileInfos.push(file);
                }
                
                processedCount++;
                if (progressCallback) {
                    progressCallback({
                        type: 'process',
                        current: processedCount,
                        total: files.length,
                        status: '파일 정보 수집 중',
                        details: `${processedCount}/${files.length} 파일 처리 중`
                    });
                }
            } catch (error) {
                console.error('[오류] 파일 정보 수집 중 오류:', error);
                // 개별 파일 오류는 건너뛰고 계속 진행
                continue;
            }
        }

        console.log('[디버그] 파일 검색 완료. 발견된 파일:', fileInfos.length);
        return fileInfos;
        
    } catch (error) {
        console.error('[오류] 파일 검색 중 오류:', error);
        throw error;
    }
}

// 유사한 파일 그룹화
async function groupSimilarFiles(files, progressCallback) {
    // console.log('[디버그] 파일 그룹화 시작. 총 파일 수:', files.length);
    
    try {
        // 시리즈 그룹 먼저 식별
        const seriesGroups = new Map();
        let processed = 0;
        const totalFiles = files.length;

        // 시리즈 파일 분석
        for (const file of files) {
            processed++;
            if (progressCallback) {
                progressCallback({
                    status: '시리즈 파일 분석 중...',
                    current: processed,
                    total: totalFiles,
                    percent: (processed / totalFiles) * 100,
                    details: `파일 분석 중: ${path.basename(file)} (${processed}/${totalFiles})`
                });
            }

            const volumeInfo = extractVolumeInfo(path.parse(file).name);
            if (volumeInfo) {
                const { seriesName } = volumeInfo;
                const normalizedName = normalizeSeriesName(seriesName);
                if (!seriesGroups.has(normalizedName)) {
                    seriesGroups.set(normalizedName, []);
                }
                seriesGroups.get(normalizedName).push(file);
            }
        }

        // console.log('[디버그] 시리즈 그룹 수:', seriesGroups.size);

        // 시리즈로 확인된 파일들 제외
        const seriesFiles = new Set();
        let groupProcessed = 0;
        const totalGroups = seriesGroups.size;

        for (const [seriesName, group] of seriesGroups) {
            groupProcessed++;
            if (progressCallback) {
                progressCallback({
                    status: '시리즈 그룹 확인 중...',
                    current: groupProcessed,
                    total: Math.max(1, totalGroups),
                    percent: (groupProcessed / Math.max(1, totalGroups)) * 100,
                    details: `시리즈 "${seriesName}" 확인 중 (${groupProcessed}/${totalGroups})`
                });
            }

            if (group.length > 1 && isSameSeries(group)) {
                group.forEach(p => seriesFiles.add(p));
                // console.log(`[디버그] 시리즈 제외: ${seriesName} (${group.length}개 파일)`);
            }
        }

        // 시리즈가 아닌 파일들만 처리
        const nonSeriesFiles = files.filter(f => !seriesFiles.has(f));
        // console.log('[디버그] 시리즈 제외 후 남은 파일 수:', nonSeriesFiles.length);

        // 해시 기반 그룹화
        const hashGroups = {};
        processed = 0;

        for (const file of nonSeriesFiles) {
            processed++;
            if (progressCallback) {
                progressCallback({
                    status: '중복 파일 검사 중...',
                    current: processed,
                    total: nonSeriesFiles.length,
                    percent: (processed / nonSeriesFiles.length) * 100,
                    details: `해시 계산 중: ${path.basename(file)} (${processed}/${nonSeriesFiles.length})`
                });
            }

            try {
                const hash = await calculateFileHash(file);
                if (!hashGroups[hash]) {
                    hashGroups[hash] = [];
                }
                hashGroups[hash].push(file);
            } catch (error) {
                // console.error(`[오류] 파일 해시 계산 중 오류 (${file}):`, error);
                continue;
            }
        }

        // 중복 파일만 남기기
        const finalGroups = {};
        let groupIndex = 0;

        // 해시 그룹 중 중복된 것만 추가
        for (const [hash, group] of Object.entries(hashGroups)) {
            if (group.length > 1) {
                finalGroups[`group_${groupIndex}`] = group;
                groupIndex++;
            }
        }

        const duplicateCount = Object.keys(finalGroups).length;
        const seriesCount = Array.from(seriesGroups.values()).filter(group => group.length > 1 && isSameSeries(group)).length;

        // console.log('[디버그] 통계:');
        // console.log(`- 총 파일 수: ${files.length}`);
        // console.log(`- 시리즈 그룹 수: ${seriesCount}`);
        // console.log(`- 시리즈 파일 수: ${seriesFiles.size}`);
        // console.log(`- 중복 파일 그룹 수: ${duplicateCount}`);

        return finalGroups;
    } catch (error) {
        // console.error('[오류] 파일 그룹화 중 오류:', error);
        throw error;
    }
}

// 유사한 그룹 출력
function printSimilarGroups(groups) {
    console.log(`\n총 ${Object.keys(groups).length}개의 중복 의심 파일 그룹 (txt 파일만):`);
    
    let groupNum = 1;
    for (const [groupName, files] of Object.entries(groups)) {
        console.log(`\n그룹 ${groupNum}:`);
        for (const file of files) {
            const stats = fs.statSync(file);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            console.log(`  ${path.basename(file)} (${sizeMB}MB)`);
        }
        groupNum++;
    }
}

// 중복 파일 처리
async function handleDuplicates(groups, duplicateDir = 'duplicates') {
    await fs.mkdir(duplicateDir, { recursive: true });
    
    console.log('\n중복 파일 처리를 시작합니다.');
    
    for (const [groupName, files] of Object.entries(groups)) {
        console.log(`\n[그룹] ${path.basename(files[0])}`);
        console.log('다음 파일들 중 남길 파일을 선택해주세요:');
        
        files.forEach((file, idx) => {
            const stats = fs.statSync(file);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            console.log(`${idx + 1}. ${path.basename(file)} (${sizeMB}MB)`);
        });
        
        while (true) {
            try {
                const answer = await question('\n남길 파일 번호를 입력하세요 (0: 건너뛰기): ');
                const choice = parseInt(answer);
                
                if (choice === 0) {
                    console.log('이 그룹을 건너뜁니다.');
                    break;
                } else if (choice >= 1 && choice <= files.length) {
                    const keepFile = files[choice - 1];
                    console.log(`\n선택한 파일을 제외한 나머지를 '${duplicateDir}' 폴더로 이동합니다:`);
                    
                    for (const file of files) {
                        if (file !== keepFile) {
                            const targetPath = path.join(duplicateDir, path.basename(file));
                            console.log(`이동: ${path.basename(file)}`);
                            await fs.rename(file, targetPath);
                        }
                    }
                    break;
                } else {
                    console.log('잘못된 번호입니다. 다시 선택해주세요.');
                }
            } catch (error) {
                console.error(`오류가 발생했습니다: ${error.message}`);
            }
        }
    }
}

// 메인 함수
async function main() {
    try {
        const defaultDir = '.';
        const dirPath = await question('처리할 디렉토리 경로를 입력하세요 (기본: 현재 디렉토리): ') || defaultDir;
        
        console.log(`대상 디렉토리: ${dirPath}`);
        
        const files = await findAllFiles(dirPath);
        console.log(`총 ${files.length}개의 파일을 찾았습니다.`);
        
        if (files.length === 0) {
            console.log('처리할 파일이 없습니다.');
            return;
        }
        
        console.log('유사한 파일 그룹화 중...');
        const similarGroups = await groupSimilarFiles(files);
        
        if (Object.keys(similarGroups).length === 0) {
            console.log('중복된 파일이 없습니다.');
            return;
        }
        
        printSimilarGroups(similarGroups);
        
        const response = await question('\n중복 파일 처리를 시작하시겠습니까? (y/n): ');
        if (response.toLowerCase() === 'y') {
            await handleDuplicates(similarGroups);
        } else {
            console.log('프로그램을 종료합니다.');
        }
        
    } catch (error) {
        console.error(`예기치 않은 오류 발생: ${error.message}`);
        throw error;
    } finally {
        rl.close();
    }
}

// 프로그램 실행
process.on('SIGINT', () => {
    console.log('\n사용자가 프로그램을 중단했습니다.');
    process.exit(0);
});

main().catch(error => {
    console.error(`예기치 않은 오류 발생: ${error.message}`);
    process.exit(1);
});

// Worker Thread 실행 여부 확인
if (!isMainThread && workerData?.isWorker) {
    workerCode();
}

// 모듈 내보내기
module.exports = {
    findAllFiles,
    groupSimilarFiles
}; 