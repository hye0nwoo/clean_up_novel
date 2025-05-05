import os
from pathlib import Path
from difflib import SequenceMatcher
from typing import List, Dict, Set, Tuple, Optional, Iterator
import shutil
import re
from collections import defaultdict
import hashlib
import multiprocessing as mp
from tqdm import tqdm
# import logging
# from datetime import datetime
import sys
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
import mmap
from functools import lru_cache
import xxhash  # 더 빠른 해시 알고리즘
import psutil  # 시스템 메모리 정보 확인용
import msvcrt
import gc

# Windows 환경에서 콘솔 출력 인코딩 설정
def setup_encoding():
    try:
        if sys.platform == 'win32':
            import ctypes
            kernel32 = ctypes.windll.kernel32
            kernel32.SetConsoleCP(65001)
            kernel32.SetConsoleOutputCP(65001)
    except Exception:
        pass

# 인코딩 설정 시도
setup_encoding()

# # 로깅 설정
# log_filename = f'novel_cleanup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
# logging.basicConfig(
#     level=logging.INFO,
#     format='%(asctime)s - %(levelname)s - %(message)s',
#     handlers=[
#         logging.FileHandler(log_filename, encoding='utf-8'),
#         logging.StreamHandler()
#     ]
# )

# 시스템 메모리 정보 가져오기
SYSTEM_MEMORY = psutil.virtual_memory()
AVAILABLE_MEMORY = SYSTEM_MEMORY.available
TOTAL_MEMORY = SYSTEM_MEMORY.total

# 메모리 관련 상수 설정 - 50MB 파일 크기에 최적화
MAX_FILE_SIZE = 50 * 1024 * 1024  # 최대 파일 크기 50MB
MAX_MEMORY_USAGE = min(AVAILABLE_MEMORY * 0.8, 8 * 1024 * 1024 * 1024)  # 8GB
CACHE_SIZE = min(32768, int(MAX_MEMORY_USAGE / (1024 * 1024)))  # 캐시 크기 최적화
CHUNK_SIZE = 2 * 1024 * 1024  # 2MB 청크 크기 (50MB 파일에 적합)
MIN_FILE_SIZE = 4096  # 4KB
BATCH_SIZE = 100  # 더 큰 배치 사이즈로 처리량 증가

# 전역 캐시 설정
filename_cache = {}
hash_cache = {}
similarity_cache = {}
normalized_cache = {}
content_cache = {}  # 파일 내용 캐시 추가

# 메모리 매핑을 위한 설정
MMAP_THRESHOLD = 4 * 1024 * 1024  # 4MB 이상의 파일에 대해 mmap 사용

# 컴파일된 정규식 패턴 - 재사용을 위해 전역 변수로 정의
_METADATA_PATTERN = re.compile(r'[\[\(\{].*?[\]\)\}]')
_SEPARATOR_PATTERN = re.compile(r'[_\-+\s]')
_NUMBER_PATTERN = re.compile(r'\d+|완$|完$')
_SPECIAL_PATTERN = re.compile(r'[^\w가-힣]')
_VOLUME_PATTERNS = [
    re.compile(pattern) for pattern in [
        r'\d+권.*?완결',
        r'\d+권.*?完',
        r'\d+권',
        r'제\d+권',
        r'\d+부',
        r'[상중하]권',
        r'vol\.\d+',
        r'volume\d+',
        r'\d+-\d+권',
        r'시즌\d+',
        r'season\d+'
    ]
]

# 시리즈 인식을 위한 패턴 추가
_SERIES_PATTERNS = [
    r'(.*?)[\s_-]*(\d+)권',  # 기본 숫자+권
    r'(.*?)[\s_-]*(\d+)-\d+권',  # 1-1권 형태
    r'(.*?)[\s_-]*[제권]\s*(\d+)',  # 제1권, 권1 형태
    r'(.*?)[\s_-]*(상|중|하)편?',  # 상/중/하 표기
    r'(.*?)[\s_-]*(first|second|third|fourth|fifth)',  # 영문 표기
    r'(.*?)[\s_-]*vol\.?\s*(\d+)',  # Vol.1 형태
    r'(.*?)[\s_-]*part\.?\s*(\d+)',  # Part.1 형태
    r'(.*?)[\s_-]*\#(\d+)',  # #1 형태
    r'(.*?)[\s_-]*(\d+)화',  # 1화 형태
    r'(.*?)[\s_-]*(\d+)장',  # 1장 형태
    r'(.*?)[\s_-]*(\d+)편',  # 1편 형태
    r'(.*?)[\s_-]*시즌\s*(\d+)',  # 시즌1 형태
    r'(.*?)[\s_-]*season\s*(\d+)',  # season1 형태
    r'(.*?)[\s_-]*(\d+)(?:\.(txt|epub))?$'  # 파일명 끝의 숫자 (확장자 포함)
]

@lru_cache(maxsize=CACHE_SIZE)
def calculate_file_hash(file_path: str, chunk_size: int = CHUNK_SIZE) -> str:
    """파일의 xxHash 해시값을 계산합니다."""
    if file_path in hash_cache:
        return hash_cache[file_path]
    
    try:
        hasher = xxhash.xxh64()
        file_size = os.path.getsize(file_path)
        
        if file_size > MAX_FILE_SIZE:
            print(f"경고: {file_path}의 크기가 50MB를 초과합니다. 건너뜁니다.")
            return ""
        
        # 4MB 미만 파일은 한 번에 읽기
        if file_size < MMAP_THRESHOLD:
            with open(file_path, "rb") as f:
                content = f.read()
                hasher.update(content)
        else:  # 큰 파일은 mmap 사용
            with open(file_path, "rb") as f:
                with mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ) as mm:
                    hasher.update(mm)
        
        result = hasher.hexdigest()
        hash_cache[file_path] = result
        return result
    except Exception as e:
        print(f"파일 해시 계산 중 오류 발생: {file_path} - {str(e)}")
        return ""

@lru_cache(maxsize=CACHE_SIZE)
def remove_metadata_tags(filename: str) -> str:
    """파일명에서 메타데이터 태그를 제거합니다."""
    if filename in filename_cache:
        return filename_cache[filename]
    
    # [xxx], (xxx), {xxx} 패턴 제거
    cleaned = re.sub(r'[\[\(\{].*?[\]\)\}]', '', filename)
    # 연속된 공백 제거
    cleaned = ' '.join(cleaned.split())
    # 앞뒤 공백 제거
    result = cleaned.strip()
    filename_cache[filename] = result
    return result

def is_volume_pattern(filename: str) -> bool:
    """파일명이 권수 패턴을 가지고 있는지 확인합니다. 컴파일된 정규식 사용."""
    filename_lower = filename.lower()
    return any(pattern.search(filename_lower) for pattern in _VOLUME_PATTERNS)

@lru_cache(maxsize=CACHE_SIZE)
def get_base_title(filename: str) -> str:
    """파일명에서 권수 표시를 제외한 기본 제목을 추출합니다."""
    # 완결 표시 먼저 제거
    base = re.sub(r'\(완결\)|완결|\(完\)|完', '', filename)
    
    # 권수 표시 패턴을 제거
    base = re.sub(r'\d+권|\d+부|[상중하]권|vol\.\d+|volume\d+|\d+-\d+권|시즌\d+|season\d+', '', base)
    
    # 남은 숫자와 특수문자 제거
    base = re.sub(r'\d+|[^\w\s]', '', base)
    
    # 연속된 공백 제거
    base = ' '.join(base.split())
    
    return base.strip()

def normalize_series_name(title: str) -> str:
    """시리즈명을 정규화합니다."""
    # 특수문자 및 공백 제거
    normalized = re.sub(r'[\s\-_]+', '', title)
    # 괄호 내용 제거
    normalized = re.sub(r'[\[\(\{].*?[\]\)\}]', '', normalized)
    # 시리즈 표시 제거
    normalized = re.sub(r'시리즈|series', '', normalized, flags=re.IGNORECASE)
    # 권/화/편 등 제거
    normalized = re.sub(r'권|화|편|장|part|vol|volume', '', normalized, flags=re.IGNORECASE)
    # 숫자 제거
    normalized = re.sub(r'\d+', '', normalized)
    return normalized.lower()

def extract_volume_info(filename: str) -> Optional[Tuple[str, str]]:
    """파일명에서 시리즈명과 권수 정보를 추출합니다."""
    for pattern in _SERIES_PATTERNS:
        match = re.search(pattern, filename, re.IGNORECASE)
        if match:
            series_name = match.group(1).strip()
            volume_info = match.group(2)
            
            # 시리즈명이 너무 짧으면 무시
            if len(series_name) < 2:
                continue
                
            return series_name, volume_info
    
    return None

def get_volume_number(volume_info: str) -> Optional[int]:
    """권수 정보를 숫자로 변환합니다."""
    # 숫자인 경우
    if volume_info.isdigit():
        return int(volume_info)
    
    # 상/중/하 변환
    volume_map = {'상': 1, '중': 2, '하': 3}
    if volume_info in volume_map:
        return volume_map[volume_info]
    
    # 영문 변환
    english_map = {
        'first': 1, 'second': 2, 'third': 3,
        'fourth': 4, 'fifth': 5
    }
    if volume_info.lower() in english_map:
        return english_map[volume_info.lower()]
    
    return None

def is_sequential_volumes(volumes: Set[int]) -> bool:
    """권수가 연속적인지 확인합니다."""
    if len(volumes) < 2:
        return False
        
    sorted_vols = sorted(volumes)
    # 1권, 2권, 3권... 패턴
    sequential = all(sorted_vols[i+1] - sorted_vols[i] == 1 
                    for i in range(len(sorted_vols)-1))
    # 1권, 10권, 11권... 패턴 (10단위 건너뛰기 허용)
    decimal_sequential = all(sorted_vols[i+1] - sorted_vols[i] in (1, 9, 10) 
                           for i in range(len(sorted_vols)-1))
    return sequential or decimal_sequential

def is_same_series(files: List[Path]) -> bool:
    """주어진 파일들이 같은 시리즈의 다른 권수인지 확인합니다."""
    if len(files) < 2:
        return False
        
    series_info = {}
    base_name = None
    
    for file in files:
        volume_info = extract_volume_info(file.stem)
        if not volume_info:
            return False
            
        series_name, volume = volume_info
        normalized_name = normalize_series_name(series_name)
        
        # 첫 번째 파일의 시리즈명을 기준으로 설정
        if base_name is None:
            base_name = normalized_name
        # 다른 파일의 시리즈명이 다르면 시리즈가 아님
        elif base_name != normalized_name:
            return False
            
        if normalized_name not in series_info:
            series_info[normalized_name] = set()
            
        volume_num = get_volume_number(volume)
        if volume_num is None:
            return False
            
        series_info[normalized_name].add(volume_num)
    
    # 시리즈가 하나만 있고, 권수가 중복되지 않으며, 연속된 숫자인지 확인
    if len(series_info) == 1:
        volumes = next(iter(series_info.values()))
        if len(volumes) > 1 and len(volumes) == len(files):
            return is_sequential_volumes(volumes)
    
    return False

@lru_cache(maxsize=CACHE_SIZE)
def normalize_filename(filename: str) -> str:
    """파일명을 정규화합니다. 정규표현식 연산을 최적화했습니다."""
    # 메타데이터 태그 제거 - 컴파일된 정규식 사용
    cleaned = _METADATA_PATTERN.sub('', filename)
    
    # 모든 구분자를 한 번에 제거
    normalized = _SEPARATOR_PATTERN.sub('', cleaned)
    
    # 숫자와 완결 표시 제거 (권수 표시는 유지)
    if not is_volume_pattern(normalized):
        normalized = _NUMBER_PATTERN.sub('', normalized)
    
    # 소문자로 통일하고 특수문자 제거
    normalized = _SPECIAL_PATTERN.sub('', normalized.lower())
    
    return normalized.strip()

@lru_cache(maxsize=CACHE_SIZE)
def get_filename_key(filename: str) -> str:
    """파일명에서 초기 그룹화를 위한 키를 생성합니다."""
    normalized = normalize_filename(filename)
    if len(normalized) >= 5:
        return normalized[:5]
    return normalized

def is_different_pattern(filename1: str, filename2: str) -> bool:
    """두 파일명의 패턴이 다른지 확인합니다."""
    # 메타데이터 태그와 숫자를 제외한 순수 문자열 추출
    def extract_base_name(filename: str) -> str:
        # 메타데이터 태그 제거
        cleaned = re.sub(r'[\[\(\{].*?[\]\)\}]', '', filename)
        # 숫자와 특수문자 제거
        cleaned = re.sub(r'\d+|[^\w\s가-힣]', '', cleaned)
        # 공백 정리
        return ' '.join(cleaned.split()).strip()
    
    base1 = extract_base_name(filename1)
    base2 = extract_base_name(filename2)
    
    # 기본 문자열이 다르면 다른 패턴
    if base1 != base2:
        return True
    
    return False

def calculate_similarity(str1: str, str2: str) -> float:
    """두 문자열 간의 유사도를 계산합니다."""
    cache_key = f"{str1}:{str2}"
    if cache_key in similarity_cache:
        return similarity_cache[cache_key]
    
    # 시리즈 정보 추출
    info1 = extract_volume_info(str1)
    info2 = extract_volume_info(str2)
    
    # 둘 다 시리즈인 경우
    if info1 and info2:
        series1, _ = info1
        series2, _ = info2
        norm1 = normalize_series_name(series1)
        norm2 = normalize_series_name(series2)
        
        # 시리즈명이 같으면 다른 권수로 간주
        if norm1 == norm2:
            similarity_cache[cache_key] = 0.0
            return 0.0
    
    # 패턴이 다른 경우 유사도를 0으로 설정
    if is_different_pattern(str1, str2):
        similarity_cache[cache_key] = 0.0
        return 0.0
    
    result = SequenceMatcher(None, str1, str2).ratio()
    similarity_cache[cache_key] = result
    return result

def process_file(file_path: Path) -> Optional[Tuple[Path, str, str, int]]:
    """파일 정보를 처리합니다."""
    try:
        normalized_name = normalize_filename(file_path.stem)
        if not normalized_name:
            return None
        
        file_hash = calculate_file_hash(str(file_path))
        file_size = file_path.stat().st_size
        return (file_path, normalized_name, file_hash, file_size)
    except Exception as e:
        # logging.error(f"파일 처리 중 오류 발생: {file_path} - {str(e)}")
        print(f"파일 처리 중 오류 발생: {file_path} - {str(e)}")
        return None

def process_file_batch(files: List[Path], batch_size: int = BATCH_SIZE) -> List[Tuple[Path, str, str, int]]:
    """파일들을 배치로 처리합니다."""
    results = []
    max_workers = min(os.cpu_count() * 2, 48)  # 더 많은 워커 허용
    
    def process_chunk(chunk: List[Path]) -> List[Tuple[Path, str, str, int]]:
        chunk_results = []
        for file in chunk:
            try:
                # 파일 크기 확인
                file_size = file.stat().st_size
                if file_size > MAX_FILE_SIZE:
                    print(f"경고: {file.name}의 크기가 50MB를 초과합니다. 건너뜁니다.")
                    continue
                    
                result = process_file(file)
                if result:
                    chunk_results.append(result)
            except Exception as e:
                print(f"파일 처리 중 오류 발생: {file} - {str(e)}")
        return chunk_results
    
    chunks = [files[i:i + batch_size] for i in range(0, len(files), batch_size)]
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(process_chunk, chunk) for chunk in chunks]
        
        for future in futures:
            try:
                chunk_results = future.result()
                results.extend(chunk_results)
            except Exception as e:
                print(f"배치 처리 중 오류 발생: {str(e)}")
    
    return results

def find_all_files(root_dir: str) -> List[Tuple[Path, str, str, int]]:
    """모든 .txt와 .epub 파일을 찾아서 병렬로 처리합니다."""
    print("파일 검색 중...")
    
    def scan_directory(path: Path) -> Iterator[Path]:
        """디렉토리를 재귀적으로 스캔하여 .txt와 .epub 파일을 찾습니다."""
        for entry in path.rglob("*"):
                    if entry.is_file():
                        ext = entry.suffix.lower()
                    if ext in ('.txt', '.epub'):
                        yield entry
    
    files = list(scan_directory(Path(root_dir)))
    if not files:
        return []
    
    # 시스템 리소스에 따른 최적의 설정
    cpu_count = os.cpu_count() or 1
    worker_count = min(cpu_count * 2, 16)  # 더 많은 워커 사용
    
    results = []
    with ProcessPoolExecutor(max_workers=worker_count) as executor:
        # 동적 배치 크기 계산 - 50MB 기준
        batch_size = max(20, min(100, len(files) // worker_count))
        
        with tqdm(total=len(files), desc="파일 처리 중") as pbar:
            futures = []
            for i in range(0, len(files), batch_size):
                batch = files[i:i + batch_size]
                futures.append(executor.submit(process_file_batch, batch))
            
            for future in as_completed(futures):
                try:
                    batch_results = future.result()
                    results.extend(batch_results)
                    pbar.update(len(batch_results))
                except Exception as e:
                    print(f"배치 처리 중 오류 발생: {str(e)}")
    
    return results

def group_similar_files(files: List[Tuple[Path, str, str, int]], 
                       similarity_threshold: float = 0.85) -> Dict[str, List[Path]]:
    """유사한 이름을 가진 파일들을 그룹화합니다."""
    # 시리즈 그룹 먼저 식별
    series_groups = defaultdict(list)
    for file_info in files:
        file_path = file_info[0]
        volume_info = extract_volume_info(file_path.stem)
        if volume_info:
            series_name, volume = volume_info
            normalized_name = normalize_series_name(series_name)
            series_groups[normalized_name].append(file_info)
    
    # 시리즈로 확인된 파일들 제외
    series_files = set()
    for series_name, group in series_groups.items():
        paths = [f[0] for f in group]
        if len(paths) > 1 and is_same_series(paths):
            series_files.update(paths)
    
    # 시리즈가 아닌 파일들만 처리
    non_series_files = [f for f in files if f[0] not in series_files]
    
    # 파일 크기별 그룹화
    size_groups = defaultdict(list)
    for file_info in non_series_files:
        size_mb = file_info[3] / (1024 * 1024)
        size_group = int(size_mb)
        size_groups[size_group].append(file_info)
    
    # 이름 기반 초기 그룹화
    initial_groups = defaultdict(list)
    for size_group in size_groups.values():
        for file_info in size_group:
            key = get_filename_key(file_info[1])
            initial_groups[key].append(file_info)
    
    final_groups = {}
    processed = set()
    
    for key, group_files in initial_groups.items():
        for i, file1_info in enumerate(group_files):
            file1, norm1, hash1, size1 = file1_info
            if file1 in processed:
                continue
            
            current_group = [file1]
            processed.add(file1)
            
            # 크기 범위 계산
            min_size = size1 * 0.5
            max_size = size1 * 1.5
            
            for file2_info in group_files[i+1:]:
                file2, norm2, hash2, size2 = file2_info
                if file2 in processed:
                    continue
                
                if min_size <= size2 <= max_size:
                    # 해시 비교
                    if hash1 and hash2 and hash1 == hash2:
                        current_group.append(file2)
                        processed.add(file2)
                        continue
                    
                    # 유사도 검사
                    sim = calculate_similarity(file1.stem, file2.stem)
                    if sim >= similarity_threshold:
                        current_group.append(file2)
                        processed.add(file2)
            
            if len(current_group) > 1:
                final_groups[norm1] = current_group
    
    return final_groups

def format_file_size(size_in_bytes: int) -> str:
    """파일 크기를 읽기 쉬운 형식으로 변환합니다."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_in_bytes < 1024:
            return f"{size_in_bytes:.1f}{unit}"
        size_in_bytes /= 1024
    return f"{size_in_bytes:.1f}TB"

def print_similar_groups(groups: Dict[str, List[Path]]):
    """유사한 파일 그룹을 출력합니다."""
    if not groups:
        print("\n중복된 파일이 없습니다.")
        return
        
    print(f"\n{'='*50}")
    print(f"총 {len(groups)}개의 중복 의심 파일 그룹이 발견되었습니다.")
    print(f"{'='*50}")
    
    for group_num, (group_name, files) in enumerate(groups.items(), 1):
        print(f"\n[그룹 {group_num}] - {len(files)}개 파일")
        print(f"{'-'*30}")
        for file in files:
            size = format_file_size(file.stat().st_size)
            ext = file.suffix.lower()
            print(f"  • {file.name} ({size}) [{ext[1:]}]")

def handle_duplicates(groups: Dict[str, List[Path]], duplicate_dir: str = 'duplicates'):
    """중복된 파일들을 처리합니다."""
    if not groups:
        return
        
    duplicate_path = Path(duplicate_dir)
    duplicate_path.mkdir(exist_ok=True)
    
    print(f"\n{'='*50}")
    print("중복 파일 처리를 시작합니다.")
    print(f"{'='*50}")
    
    for group_num, (group_name, files) in enumerate(groups.items(), 1):
        while True:
            print(f"\n[그룹 {group_num}/{len(groups)}] - {len(files)}개 파일")
            print(f"{'-'*30}")
            
            # 파일 목록 출력
            for idx, file in enumerate(files, 1):
                size = format_file_size(file.stat().st_size)
                print(f"{idx:2d}. {file.name} ({size})")
            
            # 사용자 입력 안내
            print(f"\n{'='*30}")
            print("선택 옵션:")
            print("  • 1~{}: 해당 번호의 파일을 남기고 나머지는 이동".format(len(files)))
            print("  • 0: 이 그룹 건너뛰기")
            print(f"{'='*30}")
            
            try:
                choice = get_user_input("\n선택할 파일 번호를 입력하세요: ")
                if not choice.strip():
                    continue
                
                choice = int(choice)
                if choice == 0:
                    print("\n이 그룹을 건너뜁니다.")
                    break
                elif 1 <= choice <= len(files):
                    keep_file = files[choice - 1]
                    print(f"\n선택한 파일: {keep_file.name}")
                    print(f"나머지 파일들을 '{duplicate_dir}' 폴더로 이동합니다...")
                    
                    moved_count = 0
                    for file in files:
                        if file != keep_file:
                            target_path = duplicate_path / file.name
                            try:
                                shutil.move(str(file), str(target_path))
                                moved_count += 1
                                print(f"  ✓ {file.name}")
                            except Exception as e:
                                print(f"  ✗ {file.name} - 이동 실패: {str(e)}")
                    
                    print(f"\n{moved_count}개 파일을 이동했습니다.")
                    break
                else:
                    print("\n❌ 잘못된 번호입니다. 다시 선택해주세요.")
            except ValueError:
                print("\n❌ 숫자를 입력해주세요.")
            except Exception as e:
                print(f"\n❌ 오류가 발생했습니다: {str(e)}")

def wait_key():
    """사용자 입력을 기다립니다."""
    print("\n아무 키나 누르면 프로그램이 종료됩니다...")
    if sys.platform == 'win32':
        msvcrt.getch()
    else:
        input()

def get_user_input(prompt: str) -> str:
    """사용자 입력을 안전하게 받습니다."""
    if sys.platform == 'win32':
        print(prompt, end='', flush=True)
        result = ''
        while True:
            if msvcrt.kbhit():
                char = msvcrt.getwch()
                if char == '\r':  # Enter 키
                    print()  # 새 줄
                    break
                elif char == '\x08':  # Backspace 키
                    if result:
                        result = result[:-1]
                        print('\b \b', end='', flush=True)
                else:
                    result += char
                    print(char, end='', flush=True)
        return result.strip()
    else:
        return input(prompt).strip()

def main():
    try:
        print(f"\n{'='*50}")
        print("소설 파일 정리 프로그램")
        print(f"{'='*50}")
        
        # 디렉토리 선택
        default_dir = os.getcwd()
        target_dir = get_user_input(f"\n처리할 디렉토리 경로를 입력하세요.\n기본값: 현재 디렉토리\n-> ")
        if not target_dir:
            target_dir = default_dir
            
        if not os.path.exists(target_dir):
            print(f"\n❌ 오류: 디렉토리가 존재하지 않습니다: {target_dir}")
            return

        # 유사도 임계값 선택
        print(f"\n{'='*30}")
        print("유사도 임계값 선택")
        print("1: 낮음 (0.75) - 더 많은 파일을 유사하다고 판단")
        print("2: 중간 (0.8) - 기본값")
        print("3: 높음 (0.85) - 매우 유사한 파일만 선택")
        print(f"{'='*30}")
        
        while True:
            similarity_choice = get_user_input("\n선택 (1/2/3, 엔터: 기본값): ")
            if not similarity_choice:  # 기본값
                similarity_threshold = 0.8
                print("기본값(0.8)을 사용합니다.")
                break
            elif similarity_choice in ['1', '2', '3']:
                similarity_threshold = {
                    '1': 0.75,
                    '2': 0.8,
                    '3': 0.85
                }[similarity_choice]
                break
            else:
                print("\n❌ 잘못된 선택입니다. 1, 2, 3 중에서 선택하세요.")

        # 파일 찾기
        print("\n파일 검색 중...")
        files = find_all_files(target_dir)
        if not files:
            print("\n처리할 파일을 찾을 수 없습니다.")
            return

        # 유사한 파일 그룹화
        print("\n파일 분석 중...")
        groups = group_similar_files(files, similarity_threshold)
        
        # 결과 출력
        print_similar_groups(groups)
        
        # 중복 파일 처리
        if groups:
            response = get_user_input("\n중복 파일 처리를 시작하시겠습니까? (Y/n): ")
            if response.lower() != 'n':
                handle_duplicates(groups)
                print("\n✓ 모든 작업이 완료되었습니다.")
            else:
                print("\n작업을 취소했습니다.")
        
    except KeyboardInterrupt:
        print("\n\n작업이 사용자에 의해 중단되었습니다.")
    except Exception as e:
        print(f"\n❌ 오류가 발생했습니다: {str(e)}")

if __name__ == '__main__':
    try:
        # Windows에서 멀티프로세싱 지원
        mp.freeze_support()
        
        # 프로그램 실행
        main()
        
    except Exception as e:
        print(f"\n프로그램 실행 중 오류가 발생했습니다: {str(e)}")
    finally:
        if mp.current_process().name == 'MainProcess':
            print("\n프로그램을 종료합니다.")
            wait_key()  # 메인 프로세스에서만 종료 메시지와 키 입력 대기
