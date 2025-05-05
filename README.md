# 소설 파일 정리 프로그램

[![한국어](https://img.shields.io/badge/언어-한국어-blue.svg)](README.md)
[![English](https://img.shields.io/badge/Language-English-blue.svg)](README_EN.md)

[![Status](https://img.shields.io/badge/상태-개발완료-green)](README.md)
[![Python](https://img.shields.io/badge/Python-3.8+-blue)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-lightgrey)](LICENSE)

소장용 또는 기타 이유로 개인이 가진 다량의 중복된 소설 파일(.txt)을 찾아 정리해주는 프로그램입니다.
파일이름정리프로그램과 비슷하지만 소설관리쪽으로 특화된 프로그램입니다.

## 구현 현황

| 기능 | CLI (Python) | GUI (JavaScript) | 비고 |
|------|-------------|-----------------|------|
| **파일 처리** |
| txt 파일 처리 | ✅ | ✅ | |
| epub 파일 처리 | ✅ | ✅ | v1.0.1에서 구현 완료 |
| 중복 파일 이동 | ✅ | ✅ | |
| 하위 폴더 검사 | ✅ | ❌ | GUI: 개발 중 |
| **파일명 정규화** |
| 메타데이터 태그 제거 | ✅ | ✅ | [xxx], (xxx) 등 |
| 구분자 통일 | ✅ | ✅ | _, -, + → 공백 |
| 숫자/완결 표시 제거 | ✅ | ✅ | |
| 대소문자 구분 제거 | ✅ | ✅ | |
| 초기 그룹화 | ✅ | ❌ | GUI: 개발 중 |
| 해시 기반 중복 검사 | ✅ | ✅ | 최적화된 xxHash 사용 |
| 권수 패턴 인식 | ✅ | ✅ | 개선된 패턴 인식 |
| 시리즈 중복 제외 | ✅ | ✅ | 정규화 로직 강화 |
| **성능 최적화** |
| 멀티스레드 처리 | ✅ | ❌ | GUI: 검토 중 |
| **시리즈물 처리** |
| **사용자 경험** |
| 진행 상황 표시 | ✅ | ✅ | |
| 처리 결과 리포트 | ✅ | ✅ | |
| 작업 취소/롤백 | ❌ | ❌ | 추후 구현 예정 |
| 설정 커스터마이징 | ❌ | ❌ | 추후 구현 예정 |

## 향후 개선 계획

### 품질 개선
- ⏳ 단위 테스트 추가
- ⏳ 로깅 시스템 개선
- ⏳ 에러 처리 강화

### 사용자 경험
- ⏳ 진행 상황 프로그레스 바
- ⏳ 처리 결과 상세 리포트 생성
- ⏳ 작업 취소/롤백 기능

### 추가 기능
- ⏳ 설정 파일을 통한 커스터마이징
- ⏳ 파일 내용 기반 유사도 검사 (선택적)
- ⏳ 자동 백업 기능

## 시스템 요구사항

- Windows 10 이상
- 저장공간: 처리할 파일 크기의 2배 이상

## 사용 방법

### 일반 사용자
[releases](https://github.com/hye0nwoo/clean_up_novel/releases/latest) 페이지에서 원하는 버전을 다운로드하여 실행하세요:
- [`소설 파일 중복 검사_CLI 1.0.1.exe`](https://github.com/hye0nwoo/clean_up_novel/releases/download/1.0.1/소설.파일.중복.검사_CLI.1.0.1.exe): 가벼운 명령줄 버전 (무설치 포터블 버전)

※ GUI 버전은 현재 수정 작업 중입니다.

### 개발자를 위한 정보
소스 코드를 직접 실행하고 싶은 경우:

#### CLI 버전 (Python)
- Python 3.8 이상 필요
- `cli_python` 폴더에서 `pip install -r requirements.txt` 실행
- `python cleanup_novel.py` 로 시작

#### GUI 버전 (JavaScript)
- Node.js 18.x 이상 필요
- `gui_js` 폴더에서 `npm install && npm start` 실행

## 주의사항

- 실행 전 처리할 파일들의 백업을 권장합니다
- 프로그램 실행 중 파일 수정을 피해주세요
- 처리 가능한 최대 파일 크기: 50MB
- 파일 시스템 쓰기 권한이 필요합니다

## 문제 해결

### 프로그램이 응답하지 않을 때
1. 프로그램을 종료하고 다시 실행
2. 처리할 파일 수를 줄여서 시도

### 중복 파일이 제대로 인식되지 않을 때
1. 파일명의 특수문자 확인
2. 시리즈물 표기 방식 확인

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 
