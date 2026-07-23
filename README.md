![thumbnail](./apps/web/public/images/thumbnail.png)

# Ones To Watch For FrontEnd (KR) — Monorepo

**Ones to Watch for FE**는 주목할 만한 블로그를 모아두는 웹사이트입니다.
개인적인 관심과 기록의 의미로 시작했으며, 프론트엔드 개발자에게 인사이트가 될 수 있을만한 글을 소개합니다.

이 저장소는 pnpm 워크스페이스 모노레포로 구성되어 있습니다.

## 구조

- `landing/` — 사이트 루트(`https://simyunsup.github.io/ones-to-watch-refactor-test/`)에 배포되는 변형 선택 랜딩 페이지.
- `apps/web` — 정적(Static) Astro 사이트. `/astro/` 경로에 배포됩니다.
- `apps/react-router` — 같은 사이트의 React Router v7(framework mode, prerender) 리팩토링. `/react-router/` 경로에 배포됩니다.
- `apps/tanstack-router` — TanStack Start(정적 prerender) 리팩토링. `/tanstack/` 경로에 배포됩니다.
- `apps/kudzu` — [kudzu](https://github.com/kudzujs/kudzu) 리팩토링. `/kudzu/` 경로에 배포됩니다.
- `apps/crawler` — 뉴스레터 썸네일/북마크 크롤링을 담당하는 Cloudflare Queue 워커.
- `packages/notion-loader` — Notion을 Astro Content Layer로 불러오는 재사용 가능한 로더 패키지(`@otw/notion-loader`).
- `packages/notion-content` — 프레임워크 중립 Notion 콘텐츠 페처(`@otw/notion-content`). react-router/tanstack/kudzu 앱이 빌드 타임에 사용합니다.

## 빌드 통계

CI에서 자동 갱신됨(scripts/build-stats.mjs).

<!-- build-stats:start -->
| 변형 | 빌드 시간(s) | 총 출력 크기 | JS 크기 | 파일 수 |
| --- | --- | --- | --- | --- |
| Astro | 6.6 | 5.0 MB | 99.9 KB | 157 |
| React Router | 312.8 | 6.8 MB | 325.4 KB | 284 |
| TanStack | 162.2 | 6.4 MB | 332.3 KB | 147 |
| Kudzu | 441.3 | 2.4 MB | 15.9 KB | 142 |

_GitHub Actions ubuntu-latest에서 측정, 콘텐츠 양에 따라 변동. 측정 시각: 2026-07-23T08:51:38.752Z_
<!-- build-stats:end -->

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
