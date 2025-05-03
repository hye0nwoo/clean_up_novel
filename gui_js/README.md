# 소설 파일 정리 프로그램 - GUI 버전

[![한국어](https://img.shields.io/badge/언어-한국어-blue.svg)](README.md)
[![English](https://img.shields.io/badge/Language-English-blue.svg)](README_EN.md)

[![Status](https://img.shields.io/badge/상태-재구현중-yellow)](README.md)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.x-brightgreen)](https://vuejs.org/)
[![Electron](https://img.shields.io/badge/Electron-latest-blue)](https://www.electronjs.org/)
[![License](https://img.shields.io/badge/License-MIT-lightgrey)](LICENSE)

JavaScript로 구현될 소설 파일 정리 프로그램의 웹 기반 인터페이스 버전입니다.

## ⚠️ 재구현 공지

현재 이 버전은 재구현 단계에 있습니다:
- 기존 코드가 제거되어 새로운 구현이 필요합니다
- Vue.js와 Electron 기반으로 재작성될 예정입니다
- 개발 참여를 환영합니다

## 개발 로드맵

1. Phase 1 - 프로젝트 설정 (진행 예정)
   - Vue.js 3.x 프로젝트 초기화
   - Electron 통합
   - 기본 프로젝트 구조 설정

2. Phase 2 - UI 구현 (계획)
   - 기본 컴포넌트 구현
   - 파일 업로드/드래그 앤 드롭
   - 진행 상태 표시 UI

3. Phase 3 - 핵심 기능 (계획)
   - 파일 처리 로직 구현
   - WebWorker 기반 병렬 처리
   - 데이터 저장소 구현

4. Phase 4 - 최적화 (계획)
   - 성능 최적화
   - 사용자 경험 개선
   - 테스트 및 안정화

## 계획된 기능

- 현대적이고 반응형인 웹 인터페이스
- 실시간 처리 상태 시각화
- 드래그 앤 드롭 파일 지원
- 대화형 파일 관리 시스템
- 다크/라이트 테마 지원

## 기술 스택

- Frontend: Vue.js 3.x
- Desktop: Electron
- 상태 관리: Pinia
- UI 프레임워크: Vuetify
- 빌드 도구: Vite
- 테스트: Vitest

### 프로젝트 구조 (계획)
```
gui_js/
├── src/
│   ├── components/    # Vue 컴포넌트
│   ├── views/         # 페이지 뷰
│   ├── store/         # Pinia 스토어
│   ├── services/     # 비즈니스 로직
│   └── utils/        # 유틸리티 함수
├── electron/         # Electron 관련 코드
├── public/           # 정적 파일
├── tests/           # 테스트 코드
└── package.json     # 프로젝트 설정
```

## 개발 참여

현재 프로젝트가 재구현 단계에 있어 개발 참여를 환영합니다:
1. 이슈 트래커를 통한 버그 리포트
2. 기능 개선 제안
3. 풀 리퀘스트를 통한 코드 기여

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 

## 개발 참여

현재 이 버전은 개발자의 참여를 기다리고 있습니다. 
관심 있으신 분들은 메인 저장소를 통해 연락 주시기 바랍니다.

## 주요 기능

- 현대적인 웹 인터페이스
- 실시간 처리 상태 표시
- 드래그 앤 드롭 파일 지원
- 대화형 파일 관리

## 설치 방법

### 필수 요구사항
- Node.js 16.0 이상
- npm (Node.js 패키지 관리자)

### 설치 단계
1. 의존성 패키지 설치:
```bash
npm install
```

2. 개발 서버 실행:
```bash
npm run dev
```

3. 프로덕션 빌드:
```bash
npm run build
```

## 사용 방법

### 프로그램 실행
1. 브라우저에서 `index.html` 열기
2. 소설 폴더 선택 또는 드래그 앤 드롭
3. 인터페이스에서 설정 구성
4. 처리 시작

### 인터페이스 기능
- 시각적 진행 상태 표시
- 파일 크기 및 개수 통계
- 대화형 중복 파일 관리
- 다크/라이트 테마 지원

## 기술 상세

### 사용 라이브러리
- Vue.js: UI 프레임워크
- Electron: 데스크톱 애플리케이션 래퍼
- xxhash-wasm: 고성능 해시 계산
- fuzzysort: 빠른 문자열 매칭

### 아키텍처
- 컴포넌트 기반 UI 설계
- 이벤트 기반 아키텍처
- WebWorker를 통한 백그라운드 처리
- IndexedDB를 이용한 결과 캐싱

### 성능 최적화
- 비동기 파일 처리
- 청크 단위 파일 읽기
- 메모리 효율적 작업
- 백그라운드 처리

## 개발

### 프로젝트 구조
```
gui_js/
├── src/
│   ├── components/     # Vue 컴포넌트
│   ├── services/      # 비즈니스 로직
│   ├── utils/         # 유틸리티 함수
│   └── assets/        # 정적 리소스
├── public/            # 공개 자산
├── tests/            # 단위 테스트
└── package.json      # 프로젝트 설정
```

### 사용 가능한 스크립트
```bash
# 개발 서버
npm run dev

# 테스트
npm run test

# 프로덕션 빌드
npm run build

# Electron 빌드
npm run build:electron
```

### 테스트
```bash
# 단위 테스트 실행
npm run test

# E2E 테스트 실행
npm run test:e2e
```

## 기여 방법

1. 저장소 포크
2. 기능 브랜치 생성
3. 변경사항 커밋
4. 브랜치에 푸시
5. Pull Request 생성

## 브라우저 지원

- Chrome 80 이상
- Firefox 75 이상
- Edge 80 이상
- Safari 13 이상 