![thumbnail](./apps/web/public/images/thumbnail.png)

# Ones To Watch For FrontEnd (KR) — Monorepo

**Ones to Watch for FE**는 주목할 만한 블로그를 모아두는 웹사이트입니다.
개인적인 관심과 기록의 의미로 시작했으며, 프론트엔드 개발자에게 인사이트가 될 수 있을만한 글을 소개합니다.

이 저장소는 pnpm 워크스페이스 모노레포로 구성되어 있습니다.

## 구조

- `landing/` — 사이트 루트(`https://simyunsup.github.io/ones-to-watch-refactor-test/`)에 배포되는 변형 선택 랜딩 페이지.
- `apps/web` — 정적(Static) Astro 사이트. `/astro/` 경로에 배포됩니다.
- `apps/react-router` — 같은 사이트의 React Router v8(framework mode, prerender) 리팩토링. `/react-router/` 경로에 배포됩니다.
- `apps/tanstack-router` — TanStack Start(정적 prerender) 리팩토링. `/tanstack/` 경로에 배포됩니다.
- `apps/kudzu` — [kudzu](https://github.com/kudzujs/kudzu) 리팩토링. `/kudzu/` 경로에 배포됩니다.
- `apps/crawler` — 뉴스레터 썸네일/북마크 크롤링을 담당하는 Cloudflare Queue 워커.
- `packages/notion-loader` — Notion을 Astro Content Layer로 불러오는 재사용 가능한 로더 패키지(`@otw/notion-loader`).
- `packages/notion-content` — 프레임워크 중립 Notion 콘텐츠 페처(`@otw/notion-content`). react-router/tanstack/kudzu 앱이 빌드 타임에 사용합니다.

## 빌드 통계

로컬에서 `pnpm run build:stats`를 돌리면 아래 표가 자동 갱신됩니다(scripts/build-stats.mjs). CI 자동 측정은 제거했습니다 — 공유 러너의 성능 편차로 수치 신뢰도가 낮고, 봇 커밋이 브랜치를 오염시키기 때문입니다.

<!-- build-stats:start -->
| 변형 | 빌드 시간(s) | 총 출력 크기 | JS 크기 | 파일 수 |
| --- | --- | --- | --- | --- |
| Astro | 2.4 | 769.7 KB | 99.9 KB | 24 |
| React Router | 2.6 | 593.9 KB | 321.1 KB | 18 |
| TanStack | 3.1 | 600.1 KB | 332.8 KB | 14 |
| Kudzu | 0.8 | 284.1 KB | 15.9 KB | 13 |

_로컬에서 `pnpm run build:stats`로 측정(수동 갱신), 콘텐츠 양·머신에 따라 변동. 측정 시각: 2026-07-23 (Apple M1 Max, 빈 컬렉션)_
<!-- build-stats:end -->

### CI 측정 스냅숏 (참고)

GitHub Actions ubuntu-latest(2코어)에서 실콘텐츠 123 포스트로 마지막 측정한 수치입니다. 콘텐츠가 실려도 순수 빌드는 십수 초 이내이고, 콘텐츠 스케일에 가장 민감한 변형은 프리렌더가 페이지 수에 비례하는 TanStack(로컬 대비 ×5.1)입니다. 과거 CI 수치(RR 312.8s 등)는 빌드가 아니라 Notion 페치 시간이었습니다(프리페치 캐시 도입 후 분리 측정).

| 변형 | 빌드 시간(s) | 총 출력 크기 | JS 크기 | 파일 수 | 로컬 대비 |
| --- | --- | --- | --- | --- | --- |
| Astro | 7.9 | 5.0 MB | 99.9 KB | 157 | ×3.3 |
| React Router | 8.9 | 6.8 MB | 322.8 KB | 286 | ×3.4 |
| TanStack | 15.9 | 6.4 MB | 332.8 KB | 147 | ×5.1 |
| Kudzu | 1.4 | 2.5 MB | 15.9 KB | 146 | ×1.8 |

_2026-07-23 측정 스냅숏(수동 유지). 출력 크기·파일 수 차이는 콘텐츠 유무 때문이고, JS 크기는 콘텐츠와 무관하게 동일합니다._

## 리팩토링에서 발견한 실전 결함·제약

같은 사이트를 4개 프레임워크로 이식하면서 실제로 밟은 지뢰들입니다.

1. **TanStack Start — 서브경로 배포에서 SPA 전환 무한 대기 (실버그)**
   `@tanstack/start-static-server-functions`가 프리렌더된 서버 함수 캐시를 origin 루트(`/__tsr/staticServerFnCache/...`) 절대 경로로 fetch합니다. GitHub Pages처럼 `/<repo>/` 서브경로에 배포하면 이 요청이 404가 나면서 라우트가 pending에 갇혀 클라이언트 전환이 영영 끝나지 않습니다(딥링크는 프리렌더 HTML이라 정상 → 로컬 dev에선 재현 안 됨). 이 레포에서는 해당 미들웨어를 base-aware로 벤더링해 우회했습니다(`apps/tanstack-router/src/lib/staticFunctionMiddleware.ts`, `import.meta.env.BASE_URL` 접두).
2. **React Router v7/v8 — `ssr: false` + loader 라우트는 prerender 목록이 비면 빌드 실패**
   framework mode에서 SSR을 끄면 loader가 있는 라우트는 전부 `prerender` 목록에 들어가야 합니다. 콘텐츠가 0건이라 동적 라우트(`news/post/:id`)의 경로가 하나도 안 나오는 경우까지 고려해 prerender 함수가 빈 배열 대신 정적 라우트만이라도 돌려주도록 방어해야 합니다. v7.2.0부터 생긴 SPA 폴백(prerender 미대상 경로에 자동으로 생성되는 `index.html`)은 이 제약을 없애지 않습니다 — 폴백은 클라이언트에서 매칭되는 라우트로만 하이드레이션하므로, 애초에 라우트 트리에 존재하지 않는 loader 라우트는 여전히 빌드 타임에 prerender 목록으로 커버해야 합니다.
3. **Kudzu(0.5.x, 실험적) — JSX 표현식 안 함수 호출 금지**
   JSX 내부의 함수 호출을 반응형 바인딩 캡처로 취급해 임포트한 헬퍼 호출(`siteUrl(...)` 등)을 거부합니다. 모든 URL 계산을 모듈 스코프에서 미리 끝내고 JSX에는 값만 넣어야 합니다. 클라이언트 상호작용(검색 island)은 컴파일 대상 밖의 vanilla ESM 스크립트로 분리했습니다.

## 검증 도구 (로컬 전용)

- `pnpm run perf:bench` — Lighthouse desktop(변형×홈/아카이브, 3회 중앙값) + 홈→아카이브 라우팅 전환 측정 → `bench/report.md`.
- `pnpm run origin:diff` — 라이브 원본(ones-to-watch.ethansup.net) 대비 배포 Pages 4개 변형 픽셀 diff.
- `pnpm run visual:diff` — 로컬 빌드 4개 변형 간 픽셀 diff(astro 기준).
- `pnpm run test:e2e` — Playwright e2e 20 테스트(변형 4종 × 5 시나리오).

## 개발

Node.js(fnm 권장, `.nvmrc` 참고)가 설치되어야 합니다.

```bash
corepack enable # 만약 pnpm이 없다면

pnpm install

pnpm dev
```

`pnpm build`는 `apps/web`을 정적 사이트로 빌드합니다(`apps/web/dist`).
`pnpm build:variants`는 `@otw/notion-content`를 컴파일한 뒤 react-router/tanstack/kudzu 변형을,
`pnpm build:all`은 네 앱을 전부 빌드합니다. 배포 워크플로는 네 결과물을 하나의 Pages 아티팩트로 합칩니다.

## 컨텐츠

콘텐츠 로딩에는 `NOTION_TOKEN`, `NOTION_DATABASE_ID` 환경 변수(로컬 `.env`) 또는 GitHub Actions secrets가 필요합니다.
값이 없으면 `@otw/notion-loader`/`@otw/notion-content`가 빈 컬렉션으로 정상적으로 빌드되므로, 시크릿이 없어도 사이트 자체는 빌드에 실패하지 않습니다.

직접적인 컨텐츠 기여는 [심윤섭](https://github.com/SimYunSup)이나 이슈를 통해 제안주시면 감사하겠습니다!

## License

MIT License
