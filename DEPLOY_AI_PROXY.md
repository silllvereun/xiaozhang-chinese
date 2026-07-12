# 프록시 배포 가이드 — 무료 AI 채점 연결 (5분)

`worker.js`를 Cloudflare에 배포하면, GitHub Pages 등 어디에 앱을 올려도 무료로 AI 문장 첨삭이 작동합니다. 코드 작성 불필요 — 전부 웹 화면에서 복사·붙여넣기로 끝나요.

## 무료 티어 기준 (신용카드 불필요)

- Cloudflare Workers: 하루 100,000 요청 무료
- Workers AI: 하루 10,000 뉴런 무료 → 이 앱 기준 **하루 수백 회 채점** 가능 (개인 학습량이면 절대 초과 안 함)
- 초과 시 과금되는 게 아니라 그날은 그냥 실패 → 앱이 자동으로 규칙 기반 채점으로 폴백하므로 요금 걱정 없음

## 배포 절차

1. **Cloudflare 가입** — https://dash.cloudflare.com/sign-up (이메일만 있으면 됨)

2. **Worker 생성**
   - 대시보드 왼쪽 메뉴 → **Workers & Pages** → **Create** → **Create Worker**
   - 이름을 `zh-grader` 같은 걸로 입력 → **Deploy** (일단 기본 코드로 배포됨)

3. **코드 교체**
   - 배포 후 화면에서 **Edit code** 클릭
   - 기존 코드 전부 지우고 이 저장소의 [worker.js](worker.js) 내용을 통째로 붙여넣기 → **Deploy**

4. **AI 바인딩 연결** (한 번만)
   - Worker 설정 화면 → **Settings** → **Bindings** → **Add binding** → **Workers AI** 선택
   - Variable name을 `AI`로 입력 (worker.js 코드가 `env.AI`로 참조하므로 반드시 대문자 `AI`) → 저장

5. **URL 복사**
   - Worker 개요 화면에 `https://zh-grader.<계정명>.workers.dev` 형태의 URL이 보임 → 복사

6. **앱에 연결**
   - `index.html`에서 아래 줄을 찾아 URL을 붙여넣기:
   ```js
   const AI_PROXY_URL = '';   // ← 여기에
   const AI_PROXY_URL = 'https://zh-grader.<계정명>.workers.dev';
   ```
   - 저장 후 배포(또는 새로고침)하면 끝

## 동작 확인

문장 만들기에서 아무 문장이나 채점해보세요:
- 형식이 틀리면 (단어 미포함, 너무 짧음 등) → 규칙 기반 메시지가 **즉시** 뜸 (AI 호출 안 함 = 무료 할당량 절약)
- 형식이 맞으면 → 스피너 후 AI 첨삭이 뜸
- AI가 실패하면 (할당량 초과, 네트워크 등) → 자동으로 "형식 검사 통과" 메시지로 폴백 (앱이 절대 안 죽음)

## 채점 품질에 대한 솔직한 안내

무료 티어의 Qwen 14B는 중국어 자체는 잘하지만, Claude 같은 최상위 모델보다 첨삭 정확도가 낮아요. 특히:
- 맞는 문장을 틀렸다고 하는 경우는 드물지만, **어색한 문장을 통과시키는 경우**는 종종 있음
- 교정 문장 제시 품질은 편차가 있음

개인 학습 보조용으로는 충분하지만, AI 피드백을 100% 신뢰하기보다 "참고 의견" 정도로 받아들이는 걸 권장해요. 나중에 품질을 올리고 싶으면 worker.js의 모델명 한 줄만 바꾸거나(Workers AI 내 다른 모델), Anthropic API 호출로 교체하면 됩니다(월 몇백 원 수준).

## 문제 해결

| 증상 | 원인/해결 |
|---|---|
| 채점 시 항상 규칙 기반 결과만 나옴 | `AI_PROXY_URL`이 비어있거나 오타. 브라우저 개발자도구(F12) → Network 탭에서 workers.dev 요청이 가는지 확인 |
| Worker 응답 500 | 4번 AI 바인딩이 안 됐거나 변수명이 `AI`가 아님 |
| CORS 에러 | worker.js를 수정했다면 corsHeaders 부분이 지워지지 않았는지 확인 |
