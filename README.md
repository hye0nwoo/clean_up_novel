# 소설 파일 정리 프로그램 (CLI)

[![한국어](https://img.shields.io/badge/언어-한국어-blue.svg)](README.md)
[![English](https://img.shields.io/badge/Language-English-blue.svg)](README_EN.md)

[![Status](https://img.shields.io/badge/상태-개발완료-green)](README.md)
[![Python](https://img.shields.io/badge/Python-3.8+-blue)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-lightgrey)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.0.3-blue)](README.md)

소장용 또는 기타 이유로 개인이 가진 다량의 중복된 텍스트 및 epub 파일을 찾아 정리해주는 CLI 프로그램입니다.  
파일이름정리프로그램과 비슷하지만 소설관리쪽으로 특화된 프로그램입니다.  
ex)  
[현판] 현판소설입니다 1-120.txt  
현판소설입니다 1-159.txt  
현판소설입니다 1-200(완).txt  
같은 파일들이 있을 경우 위 3개파일은 하나의 그룹으로 묶여 사용자가 원하는 파일 하나만 남기고 나머지 중복 파일들은 duplicates 폴더로 이동시킵니다.  
(유사도 임계값: 0.75 - 더 많은 파일을 유사하다고 판단)

## 기술 스택

### 핵심 기술
- **Python 3.8+**: 메인 프로그래밍 언어
- **tqdm**: 진행 상황 표시
- **psutil**: 시스템 리소스 모니터링

### 빌드 및 배포
- **PyInstaller**: 실행 파일 생성

## 주요 기능

- txt 및 epub 파일 처리
- 중복 파일 검출 및 이동
- 하위 폴더 검사
- 파일명 정규화 (메타데이터 태그 제거, 구분자 통일 등)
- 권수 패턴 인식
- 시리즈 중복 제외
- 멀티스레드 처리
- 진행 상황 표시
- 처리 결과 리포트

## 시스템 요구사항

- Windows 10 이상
- Python 3.8 이상
- 저장공간: 처리할 파일 크기의 2배 이상

## 사용 방법

### 일반 사용자
[releases](https://github.com/hye0nwoo/clean_up_novel/releases/latest) 페이지에서 원하는 버전을 다운로드하여 실행하세요:
- [`소설 파일 중복 검사_CLI 1.0.3.exe`](https://github.com/hye0nwoo/clean_up_novel/releases/download/1.0.3/cleanup_novel_CLI.1.0.3.exe): 가벼운 명령줄 버전 (무설치 포터블 버전)

※ 알 수 없는 게시자 경고가 뜬다면 추가정보 --> 실행 버튼을 누르면 됩니다.

### 개발자를 위한 정보
소스 코드를 직접 실행하고 싶은 경우:

1. Python 3.8 이상 설치
2. `pip install -r requirements.txt` 실행
3. `python main.py` 로 시작

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
