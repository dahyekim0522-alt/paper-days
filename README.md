# Paper Days · 차곡차곡, 나의 날들

종이 다이어리처럼 펼치고 넘기는 한국어 개인 기록 웹앱입니다. 회원가입, 서버, 유료 API 또는 API 키 없이 일기와 사진을 현재 브라우저에 저장합니다.

## 설치 및 실행

Node.js **24 LTS**와 npm을 사용합니다. `.nvmrc`에 버전을 지정했습니다. Windows PowerShell에서도 같은 명령을 사용할 수 있습니다.

```sh
cd paper-days
npm ci
npm run dev
```

터미널에 표시된 개발 서버 주소를 브라우저에서 엽니다. 클라우드 환경에서는 기존 `/workspace/paper-days` 체크아웃을 사용하며 별도 worktree가 필요하지 않습니다.

```sh
npm test          # Vitest 데이터/날짜/복원 검증
npm run test:e2e  # Chromium 사용자 흐름 검증
npm run build     # TypeScript 검사 + 정적 배포 파일 생성
npm run preview   # dist 빌드 확인
```

E2E는 시스템 `/usr/bin/chromium`이 있으면 사용합니다. 다른 환경에서는 먼저 `npx playwright install chromium`을 실행하세요. Linux CI에서 필요한 OS 라이브러리까지 설치하려면 `npx playwright install --with-deps chromium`을 사용합니다. 테스트 서버는 Playwright가 자동 시작·종료합니다. Vite 개발 서버 기본 포트는 5173입니다.

## 구현된 기능

- 패브릭 질감의 녹색 표지, 표지 열기 효과, 크림 종이·노트 줄·제본 그림자
- 실제 종이 말림/앞뒷면/그림자, 마우스 모서리 드래그, 모바일 양방향 스와이프, 이전·다음 버튼, 방향키
- PC·태블릿 2페이지, 작은 화면 1페이지, 모션 감소 시스템 설정
- 날짜당 하나의 일기, 제목·여러 문단·5가지 감정, 기존 기록 수정·확인 후 삭제
- 800ms 자동 저장, 상태 안내, 저장 실패 시 입력 보존·재시도, 미저장 종료 경고, 초안 복구
- 편집 중 페이지 넘김 차단, 닫기 전 저장 대기, 확인 후 편집 취소/원상 복구
- 사진 업로드·검증·압축·미리보기·삭제·Blob 저장, Object URL 정리
- 월간 달력의 기록 표시·날짜 이동·오늘 이동, 제목/본문 검색·날짜 역순 결과
- 일기와 사진을 포함한 버전 있는 JSON 백업, 구조 검증·확인 후 트랜잭션 복원
- 6페이지만 렌더링하는 날짜 창과 데이터/페이지 매핑 분리
- 로컬 무료 한글 폰트, 키보드 및 dialog 포커스, 빈 상태·로딩·오류 안내

모바일에서는 날짜당 본문과 사진이 각각 1페이지입니다. 다음 날로 가려면 2장을 넘깁니다. 긴 일기와 많은 사진은 페이지 내부에서 스크롤할 수 있습니다. 표지로 돌아가려면 왼쪽 위 Paper Days를 누르세요.

## 데이터 안내

IndexedDB(`paper-days`)에 `entries`, `photos`, `drafts`를 저장합니다. 저장 키는 브라우저의 **origin(프로토콜·호스트·포트)** 단위이므로 개발 서버와 배포 사이트의 기록은 서로 분리됩니다. 공유 기기에서는 같은 브라우저를 쓰는 다른 사람이 기록을 볼 수 있습니다. 암호화 기능은 없습니다.

브라우저 데이터 삭제, 비공개 모드 종료, 저장소 회수 시 데이터가 사라질 수 있습니다. 설정에서 정기적으로 백업하세요. 복원은 기존 데이터 전체를 교체하므로 현재 기록을 먼저 백업해야 합니다. 새 기기나 다른 주소로 이동할 때도 백업/복원으로 옮길 수 있습니다.

사진은 장당 20MB 이하 원본, 하루 8장까지이며 긴 변 1600px WebP로 변환합니다. 백업 파일 제한은 150MB입니다. 저장 공간 부족 시 다른 데이터를 지우거나 사진을 줄인 후 다시 저장하세요. 강제 종료 직전 아직 완료되지 않은 사진 저장은 복구가 보장되지 않습니다.

## GitHub Pages 배포

1. 이 소스와 `package-lock.json`을 `main`에 커밋하여 GitHub에 푸시합니다.
2. 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 선택합니다.
3. 포함된 `.github/workflows/pages.yml`이 설치 → 단위 테스트 → 브라우저 테스트 → 빌드 → Pages 배포를 수행합니다. Actions에서 수동 실행할 수도 있습니다.
4. 워크플로가 성공한 후 표시하는 배포 주소로 접속합니다.

Vite의 `base: './'` 설정으로 저장소 하위 경로를 지원합니다. `dist/` 전체를 다른 정적 호스팅에 올려도 됩니다. 이 작업에서는 GitHub로 푸시하거나 실제 배포하지 않았습니다.

## 구조

```text
src/
  components/  book, diary, calendar, search, settings, common
  hooks/       모션 감소 설정
  db/          Dexie 테이블과 저장 트랜잭션
  models/      일기·사진 타입, page-flip 선언
  utils/       날짜/페이지 매핑, 사진 변환, 백업/복원, 애니메이션 수명 관리
  styles/      디자인 및 반응형 CSS
  assets/      이미지 등을 위한 확장 위치
```

## 테스트와 알려진 제한

실행 환경의 빌드, 단위 테스트 및 브라우저 결과는 [검증 기록](docs/VALIDATION.md)을 참고하세요. 구현 선택, 라이브러리 문제의 보완 방법, 미검증 범위는 [구현 결정](docs/DECISIONS.md)에 설명했습니다.

모바일은 스와이프를 놓으면 페이지 말림 애니메이션을 시작합니다. 손가락을 따라 실시간으로 구부리는 터치 드래그는 제공하지 않습니다. 실제 iOS/Android 기기·Safari·Windows 검증, 클라우드 동기화, 암호화, PWA 오프라인 설치, 사진 자유 배치는 제공하지 않습니다.

## 라이브러리 및 라이선스

| 라이브러리 | 용도 | 라이선스 |
| --- | --- | --- |
| React / React DOM | UI | MIT |
| TypeScript / Vite | 타입 검사·개발·빌드 | Apache-2.0 / MIT |
| page-flip 2.0.7 | StPageFlip 종이 넘김 엔진 | MIT |
| Dexie | IndexedDB 트랜잭션 | Apache-2.0 |
| lucide-react | 아이콘 | ISC |
| Noto Sans KR / Nanum Pen Script | 본문 / 손글씨 폰트, Fontsource로 자체 호스팅 | SIL OFL 1.1 |
| Vitest / Playwright / fake-indexeddb | 자동화 테스트 | MIT / Apache-2.0 / Apache-2.0 |

폰트 라이선스 전문은 [docs/licenses](docs/licenses)에 보관했습니다. 원격 폰트 서버나 이미지 API를 사용하지 않습니다. 정확한 설치 버전은 `package-lock.json`으로 고정합니다.
