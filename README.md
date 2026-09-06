# 샤오장학당 · 小张学堂

함께 만들고, 입력하면서 익히는 중국어 학습 공간.

기존 JavaScript와 Supabase 데이터를 유지하며 공개 단어장 → 학습 → 타자 → 시험 → 복습 흐름을 제공합니다.

- 공개 단어 검색·카테고리·즐겨찾기·학습 카드
- 공개 기준문장 10개와 기존 개인 문장, 힌트 4단계
- 중국어 IME 보호, 입력 시간, 비AI 정규화·편집거리 채점
- 기존 병음/한자 단어 시험 및 문장 암기 시험
- 자동 오답복습, 연속 3회 정답 시 완료, 계정별 저장과 서버 동기화 큐
- 모바일 하단 메뉴와 정적 URL 진입점

```powershell
npm ci
npm run dev
npm test
npm run lint
npm run build
npm run preview
```

Node 22 이상. 운영 산출물은 `dist/`. Supabase와 CDN 라이브러리에 네트워크 연결이 필요하며 생성형 AI API는 호출하지 않습니다.

[배포·DB·도메인·복구 절차](README_DEPLOY.md), [작업 로그](WORK_LOG.md), [2차 로드맵](ROADMAP.md).

현재 로컬 핵심 기능과 빌드를 검증했습니다. 운영 DB SQL 적용, 실기 IME, GitHub Pages 실제 배포, 구매 도메인/HTTPS는 미완료입니다. 서버 동기화는 DB 마이그레이션 후 사용할 수 있습니다.