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

// 파일 해시 계산 (스트림 처리)
async function calculateFileHash(filePath, chunkSize = 8192) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('md5');
        const stream = createReadStream(filePath, { highWaterMark: chunkSize });

        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

// 파일 처리
async function processFile(filePath) {
    try {
        const hash = await calculateFileHash(filePath);
        const stats = await fs.stat(filePath);
        return { hash, size: stats.size };
    } catch (error) {
        console.error(`파일 처리 중 오류 발생: ${filePath} - ${error.message}`);
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
            const { filePath, normalizedName } = data;
            const hash = await processLargeFile(filePath);
            const stats = await fs.stat(filePath);
            
            parentPort.postMessage({
                path: filePath,
                normalizedName,
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

// 같은 시리즈 확인
function isSameSeries(files) {
    const volumeFiles = files.filter(f => isVolumePattern(path.parse(f).name));
    
    if (volumeFiles.length >= 2) {
        const baseTitles = new Set(volumeFiles.map(f => getBaseTitle(path.parse(f).name)));
        if (baseTitles.size === 1) {
            const volumes = volumeFiles
                .map(f => {
                    const match = path.parse(f).name.toLowerCase().match(/\d+(?=권)/);
                    return match ? parseInt(match[0]) : null;
                })
                .filter(v => v !== null);
            return volumes.length === new Set(volumes).size;
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

// 모든 파일 찾기
async function findAllFiles(rootDir) {
    return new Promise((resolve, reject) => {
        glob('**/*.txt', { cwd: rootDir }, async (err, files) => {
            if (err) {
                reject(err);
                return;
            }

            if (files.length === 0) {
                resolve([]);
                return;
            }

            const fileInfos = [];
            const promises = files.map(async file => {
                const fullPath = path.join(rootDir, file);
                const normalizedName = normalizeFilename(path.parse(file).name);
                
                if (normalizedName) {
                    const result = await processFile(fullPath);
                    if (result) {
                        fileInfos.push({
                            path: fullPath,
                            normalizedName,
                            hash: result.hash,
                            size: result.size
                        });
                    }
                }
            });

            await Promise.all(promises);
            resolve(fileInfos);
        });
    });
}

// 유사한 파일 그룹화
async function groupSimilarFiles(files, similarityThreshold = 0.85) {
    const groups = new Map();
    
    for (const file1 of files) {
        if (groups.has(file1.path)) continue;
        
        const currentGroup = [file1.path];
        
        for (const file2 of files) {
            if (file1.path === file2.path || groups.has(file2.path)) continue;
            
            if (file1.hash && file2.hash && file1.hash === file2.hash) {
                currentGroup.push(file2.path);
                continue;
            }
            
            const similarity = calculateSimilarity(
                path.parse(file1.path).name,
                path.parse(file2.path).name
            );
            
            if (similarity >= similarityThreshold) {
                currentGroup.push(file2.path);
            }
        }
        
        if (currentGroup.length > 1) {
            groups.set(file1.path, currentGroup);
            currentGroup.forEach(path => groups.set(path, currentGroup));
        }
    }
    
    const uniqueGroups = new Map();
    for (const [_, group] of groups) {
        const key = group.sort()[0];
        if (!uniqueGroups.has(key)) {
            uniqueGroups.set(key, group);
        }
    }
    
    return Object.fromEntries(uniqueGroups);
}

// 유사한 그룹 출력
function printSimilarGroups(groups) {
    console.log(`\n총 ${groups.size}개의 중복 의심 파일 그룹 (txt 파일만):`);
    
    let groupNum = 1;
    for (const [groupName, files] of groups) {
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
    
    for (const [groupName, files] of groups) {
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
        
        if (similarGroups.size === 0) {
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