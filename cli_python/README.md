# 소설 파일 정리 프로그램 - CLI 버전

[![한국어](https://img.shields.io/badge/언어-한국어-blue.svg)](README.md)
[![English](https://img.shields.io/badge/Language-English-blue.svg)](README_EN.md)

[![Status](https://img.shields.io/badge/상태-재구현중-yellow)](README.md)
[![Python](https://img.shields.io/badge/Python-3.8+-blue)](https://www.python.org/)
[![rapidfuzz](https://img.shields.io/badge/rapidfuzz-2.x-green)](https://github.com/maxbachmann/RapidFuzz)
[![License](https://img.shields.io/badge/License-MIT-lightgrey)](LICENSE)

Python으로 구현될 소설 파일 정리 프로그램의 명령줄 인터페이스 버전입니다.

## ⚠️ 재구현 공지

현재 이 버전은 재구현 단계에 있습니다:
- 기존 코드가 제거되어 새로운 구현이 필요합니다
- 이전 버전의 기능을 개선하여 재작성될 예정입니다
- 개발 참여를 환영합니다

## 개발 계획

1. Phase 1 - 기본 기능 구현
   - 파일 처리 로직 구현
   - 유사도 비교 알고리즘 구현
   - 기본 CLI 인터페이스 구현

2. Phase 2 - 성능 최적화
   - 멀티스레드/멀티프로세스 구현
   - 메모리 사용량 최적화
   - 대용량 파일 처리 개선

3. Phase 3 - 안정화
   - 테스트 코드 작성
   - 에러 처리 개선
   - 성능 테스트 및 최적화

## 계획된 기능

- 순수 Python 구현
- 고성능 병렬 처리
  - ThreadPoolExecutor: 파일 IO 작업 병렬화
  - ProcessPoolExecutor: CPU 집약적 연산 병렬화
- 메모리 최적화 처리
- 대용량 파일 처리

## 설치 방법

### 필수 요구사항
- Python 3.8 이상
- pip (Python 패키지 관리자)
- 멀티코어 CPU 권장

### 설치 단계
1. 필요한 패키지 설치:
```bash
pip install -r requirements.txt
```

## 사용 방법

### 기본 사용법
```bash
python cleanup_novel.py [폴더경로]
```

### 옵션
```bash
python cleanup_novel.py --help
  --dir PATH           검사할 폴더 경로 (기본값: 현재 폴더)
  --threshold FLOAT    유사도 임계값 (기본값: 0.85)
  --max-size INT      최대 파일 크기(MB) (기본값: 50)
```

### 사용 예시
```bash
# 기본 설정으로 현재 폴더 검사
python cleanup_novel.py

# 특정 폴더를 지정하고 임계값 변경
python cleanup_novel.py "D:/소설" --threshold 0.9
```

## 기술 상세

### 사용 라이브러리
- rapidfuzz: 문자열 유사도 비교
- tqdm: 진행률 표시
- multiprocessing: 멀티프로세스 처리
- concurrent.futures: 스레드 풀 관리

### 성능
- 멀티프로세스 처리 (ProcessPoolExecutor)
  - CPU 코어 수에 따른 자동 최적화
  - 유사도 비교 등 CPU 집약적 작업 병렬화
  - 동적 배치 크기 조정
- 멀티스레드 처리 (ThreadPoolExecutor)
  - 파일 IO 작업 병렬화
  - 파일 읽기/쓰기 작업 최적화
  - 효율적인 메모리 관리
- 메모리 최적화
  - 스트리밍 방식 파일 읽기
  - 캐시를 통한 중복 계산 방지
  - 메모리 사용량 모니터링

### 파일 처리
- 기본 텍스트 인코딩 처리
- 스마트 시리즈 감지
- 메타데이터 태그 처리
- 파일명 정규화

## 프로젝트 구조 (계획)
```
cli_python/
├── src/
│   ├── core/          # 핵심 로직
│   ├── utils/         # 유틸리티 함수
│   └── cli/           # CLI 인터페이스
├── tests/             # 테스트 코드
├── docs/              # 문서
└── requirements.txt   # 의존성 패키지
```

## 개발 참여

현재 프로젝트가 재구현 단계에 있어 개발 참여를 환영합니다:
1. 이슈 트래커를 통한 버그 리포트
2. 기능 개선 제안
3. 풀 리퀘스트를 통한 코드 기여

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 