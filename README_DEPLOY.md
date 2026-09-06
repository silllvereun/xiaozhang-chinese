# 샤오장학당 배포·복구

## 현재 상태

기존 Supabase 프로젝트를 유지한다. Node 22 이상은 테스트·정적 파일 복사에만 사용하며 웹 서버 구매는 필요 없다. 생성형 AI·유료 AI API는 운영 산출물에 포함되지 않는다. `worker.js`와 `DEPLOY_AI_PROXY.md`는 이전 자료이며 새 배포 대상이 아니다.

2026-09-06 로컬 Edge 검증: 운영 Supabase 공개 단어 535개 조회, IME 합성 이벤트, 채점/복습, 4단계 힌트, 320px 화면, 5개 경로 직접 접속 통과. 실제 Windows/macOS/Android/iOS 중국어 키보드의 후보 선택은 별도 기기 검증이 필요하다.

**운영 DB 마이그레이션·GitHub push/Pages 설정·실제 운영 배포·도메인/HTTPS는 아직 수행하지 않았다.** 아래 절차 완료 전 공개 출시 완료로 보지 않는다. 새 학습 기록은 서버가 준비되지 않아도 계정별 로컬 큐에 남고 계정 설정에서 동기화를 재시도할 수 있다.

## 실행 명령

```powershell
npm ci
npm run dev
npm test
npm run lint
npm run build
npm run preview
```

런타임 npm 의존성은 없다. 이 작업 환경은 사용자 폴더의 npm 실행 경로가 sandbox에 차단되어 다음 동일 스크립트를 직접 검증했다.

```powershell
node scripts/check.js
node --test tests/*.test.js
node scripts/build.js
node scripts/serve.js dist
```

개발/미리보기 주소는 `http://127.0.0.1:4173`이다. 개발 모드는 `/#/typing` 형식, 빌드 후에는 `/typing/`도 직접 열린다. GitHub Pages는 디렉터리 진입점으로 새로고침을 처리하므로 서버 rewrite가 필요 없다. 하위 경로 `/xiaozhang-chinese/`와 독립 도메인 루트에서 같은 파일을 사용한다. 이전 `#quiz`, `#manage`, `#sentence`, `#notes`와 해당 경로도 호환한다.

## DB 반영 순서

1. 기존 Supabase SQL Editor에서 테이블 정의와 `pg_policies`를 확인하고 데이터 및 정책을 백업한다. 관리 권한은 공개 anon key로 대체할 수 없다.
2. `db/001_academy.sql` 실행: 공개 기준문장, 개인 시도/복습, RLS, 서버 재채점 RPC.
3. `db/002_reference_sentences.sql` 실행: 공개 기준문장 10개 추가. 기존 문장과 충돌하면 기존 행을 유지한다.
4. `db/003_existing_permissions.sql`을 검토 후 실행: 기존 테이블의 정책을 소유자/관리자 정책으로 교체. 기존 소유자 없는 단어는 관리자만 편집한다. 관리자 역할은 신뢰된 서버에서 `app_metadata.role=admin`으로 지정한다. 사용자 수정 가능 metadata를 권한으로 사용하지 않는다.
5. 회원 A/B 각각으로 데이터 격리·로그아웃·비회원 공개 조회를 확인한다. 새 개인 테이블 직접 쓰기는 거부되어야 하며 `academy_record_attempt` RPC만 허용한다. 정확도/정답 여부를 조작한 payload도 서버에서 다시 계산되어야 한다.
6. SQL 함수는 로컬 PostgreSQL 실행 환경이 없어 실제 DB에서 검증하지 못했다. 적용 전 staging에서 정규화·허용 답안·Unicode·재시도 중복 방지·복습 3회 완료를 검증한다.

기존 `words`, `characters`, `word_progress`, `sentences`, `sentence_words` 데이터는 삭제하거나 새 프로젝트로 옮기지 않는다. 새 테이블은 `academy_` 접두어로 기존 문장 구조와 충돌하지 않는다. 단어 조회는 500개씩 페이지를 나눠 최대 10,000개, 공개 문장 및 기록 조회는 현재 1,000개 한도다. 1,000개를 넘는 계정의 전체 기록 동기화·공개 조회 rate limit은 출시 전 백엔드에서 보완해야 한다.

## GitHub Pages

1. 테스트 후 변경사항을 검토하고 저장소에 반영한다. 작업 시작 전 `index.html`에는 사용자 변경이 있었으므로 전체 diff에 기존 삭제 내용이 포함된다.
2. Settings → Pages → Source를 GitHub Actions로 지정한다.
3. `.github/workflows/pages.yml`은 main push/수동 실행에서 테스트 → lint → build → dist 배포를 수행한다. PR에서는 빌드만 수행한다.
4. Pages build 결과와 배포 URL을 확인하고 `/vocabulary/`, `/learn/`, `/typing/`, `/test/`, `/review/`를 새 브라우저에서 열고 새로고침한다. 존재하지 않는 주소는 404 안내가 표시되어야 한다.
5. 운영 콘솔/네트워크 오류, Supabase 인증 리다이렉트 URL allowlist, 로그인/로그아웃, 타자→시험→복습 흐름을 확인한다.

공개 Supabase URL과 anon 키만 브라우저에 포함한다. `.env`나 관리자/service-role 키는 절대 빌드에 넣지 않는다. 현재 빌드 검사는 클라이언트 JWT 역할과 흔한 비밀키 패턴을 검사하지만 전체 Git 이력 보안 감사를 대신하지 않는다.

## 도메인·HTTPS

구매 도메인명은 아직 제공되지 않았다. GitHub 도메인 소유권 검증 후 Pages Custom domain에 대표 주소를 먼저 저장하고 DNS를 연결한다.

| 유형 | 호스트 | 값 |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | silllvereun.github.io |

와일드카드 레코드는 사용하지 않는다. DNS 반영 후 Enforce HTTPS를 켜고 http/https, www/루트, 이전 github.io 주소의 대표 주소 이동을 확인한다. Actions 배포에서는 CNAME 파일 대신 저장소 Pages 설정을 사용한다. 독립 도메인 적용 시 workflow의 `PAGES_BASE_PATH`를 `/`로 바꾸고 index 메타데이터, robots, sitemap, Supabase redirect allowlist를 함께 갱신한다.

기준: [GitHub 공식 도메인 설정](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site), 2026-09-06 확인.

## 복구와 운영

- 웹 오류: 직전 정상 commit의 Actions를 재실행한다. DB 테이블을 삭제해서 롤백하지 않는다.
- DB 정책 문제: 사전 백업한 정책을 복원한다. 소유권 없는 기존 행을 임의 사용자에게 일괄 배정하지 않는다.
- 새 기록 저장 실패: 로컬 큐가 보존된다. 계정 설정에서 JSON 백업 후 DB 연결을 복구하고 동기화를 재시도한다.
- 기존 백업: 계정 설정의 단어장 XLSX 내보내기/가져오기를 사용한다. 신규 기록 JSON에는 원본 답안이 들어 있으므로 개인 파일로 취급한다.
- 오류 조사: 브라우저 Console/Network, GitHub Actions 로그, Supabase API/Postgres 로그를 확인한다. 원본 답안·이메일을 공개 이슈에 올리지 않는다.
- 출시 전 미완료: 운영 주체·연락처가 포함된 개인정보처리방침/이용 안내, 계정 삭제 절차, 실제 DB 정책 검증, 모바일 실기 IME, 운영 배포 및 HTTPS 검증.
