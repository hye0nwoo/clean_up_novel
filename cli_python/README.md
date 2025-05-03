# 소설 파일 정리 프로그램 (CLI 버전)

Python으로 작성된 소설 파일 정리 프로그램의 CLI 버전입니다.

## 설치 방법

```bash
pip install -r requirements.txt
```

## 사용 방법

```bash
python cleanup_novel.py [폴더경로]
```

## 주요 기능

- 파일명 기반 중복 검사
- 메타데이터 태그 제거 후 비교
- 시리즈물 자동 인식
- 중복 파일 'duplicates' 폴더로 이동 