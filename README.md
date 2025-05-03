# 소설 파일 정리 프로그램

[![한국어](https://img.shields.io/badge/언어-한국어-blue.svg)](README.md)
[![English](https://img.shields.io/badge/Language-English-blue.svg)](README_EN.md)

[![Status](https://img.shields.io/badge/상태-재구현중-yellow)](README.md)
[![Python](https://img.shields.io/badge/Python-3.8+-blue)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-lightgrey)](LICENSE)

중복된 소설 파일(.txt, .epub)을 찾아 정리해주는 프로그램입니다.

## ⚠️ 중요 공지

현재 프로그램이 재구현 단계에 있습니다:
- 기존 파일들이 제거되어 재구현이 필요한 상태입니다
- CLI 버전과 GUI 버전 모두 코드 재작성이 진행될 예정입니다
- 이전 버전의 기능을 개선하여 새롭게 구현할 예정입니다

## 개발 계획

1. CLI 버전 (Python)
   - 이전 버전의 핵심 기능 복원
   - 성능 및 안정성 개선
   - 테스트 코드 강화

2. GUI 버전 (JavaScript)
   - Vue.js 기반 새로운 인터페이스 구현
   - Electron을 통한 데스크톱 앱 제공
   - 사용자 경험 최적화

## 주요 기능 (구현 예정)

- 파일명 기반 중복 검사
  - 메타데이터 태그([xxx], (xxx)) 무시
  - 시리즈물 자동 인식 (1권, 제1권, vol.1 등)
  - 띄어쓰기, 특수문자 차이 무시
- 중복 파일 자동 정리
  - 'duplicates' 폴더로 자동 이동
  - 원본 폴더 구조 유지
- 파일 처리
  - 멀티코어 병렬 처리 지원
  - 대용량 파일 처리 최적화
  - 50MB 이하 파일 처리
  - 메모리 사용량 최적화

## 버전 안내

1. [CLI 버전](cli_python/README.md)
   - Python 기반 명령줄 인터페이스
   - 멀티스레드/멀티프로세스 처리
   - 효율적인 중복 파일 검사

2. [GUI 버전](gui_js/README.md)
   - JavaScript/Vue.js 기반 웹 인터페이스
   - Electron 기반 데스크톱 앱
   - 사용자 친화적 인터페이스

## 시스템 요구사항

- 운영체제: Windows 10 이상
- Python 3.8 이상 (CLI 버전)
- Node.js 18.x 이상 (GUI 버전)
- 메모리: 4GB 이상 권장
- 저장공간: 처리할 파일 크기의 2배 이상
- 멀티코어 CPU 권장

## 개발 참여

현재 프로젝트가 재구현 단계에 있어 개발 참여를 환영합니다:
1. 이슈 트래커를 통한 버그 리포트
2. 기능 개선 제안
3. 풀 리퀘스트를 통한 코드 기여

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 주의사항

- 실행 파일이 있는 폴더에 쓰기 권한이 필요합니다.
- 처리 중인 파일을 수정하지 마세요.
- 50MB 초과 파일은 처리되지 않습니다.
- 손상된 텍스트 파일은 올바르게 처리되지 않을 수 있습니다.

## 문제 해결

### 프로그램이 응답하지 않을 때
1. 프로그램을 종료하고 다시 실행
2. 처리할 파일 수를 줄여서 시도

### 중복 파일이 제대로 인식되지 않을 때
1. 다른 유사도 임계값으로 시도
   - 0.8: 느슨한 검사
   - 0.85: 기본값
   - 0.9: 엄격한 검사
2. 파일명의 특수문자 확인
3. 시리즈물 표기 방식 확인 