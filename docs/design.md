# 설계 메모 — G3조 공공임대 입주 신청 서류 점검 서비스

> 팀 PRD ② 블록에서 작성(드라이버 세션, team_plan과 함께) · 목적은 둘 — **두 사람이 같은 파일을 동시에 고치지 않게** 경계를 정하고, **페이지끼리 주고받는 데이터 약속**을 먼저 고정하는 것. 길게 쓰지 않습니다.
> PRD: `prd/team_prd.md` · **[가정]**은 PRD에서 정하지 않아 일단 이렇게 두는 것입니다(`docs/team_decisions.md`에도 기록).

## 1. 페이지 지도와 파일 경계

| 역할 | 페이지·하는 일 | 담당 파일 (이 사람만 고친다) | 읽기만 하는 파일 |
|---|---|---|---|
| ① 통합·화면 (A) | 시작 페이지 — 메뉴, 저장된 데이터 요약(누락 n·발급일 어긋남 n·확인 필요 n), 백업 내보내기·가져오기, 비우기 | `tools/index.html`, `tools/assets/common.js`, `tools/assets/style.css`, `README.md`, `docs/demo_script.md` | ②·③의 파일 |
| ② 기능 A (B) | 누락 서류 대조 — 신청 서류 CSV 파일 선택 → 신청 유형별 필수서류표(가상)와 대조 → 누락 목록 | `tools/pages/docs_check.html`, `tools/assets/docs_check.js` | `common.js`, `data/` |
| ③ 기능 B (A) | 발급일 유효 확인 — ②가 저장한 서류 목록을 읽어 가상 모집공고일 기준으로 발급일 어긋남 목록 | `tools/pages/docs_date.html`, `tools/assets/docs_date.js` | `common.js`, `data/` |
| ④ 검증·데이터 (B) | — | `data/team_sample.csv`, `tests/acceptance.md`, `tests/run_acceptance.py` | ①②③의 파일 |

- 두 역할이 같은 파일을 고치지 않습니다. A는 ①·③, B는 ②·④ 파일만 고칩니다.
- 필수서류표는 `docs_check.js`에, 가상 모집공고일과 유효 기간 규칙은 `docs_date.js`에 상수로 둡니다(PRD 3-2).

`CLAUDE.md` '파일 분담' 표도 이 표와 같게 맞춥니다(작업 계획 PR에서).

## 2. 데이터 약속

- localStorage 키: `teamG3_app` (이 키 하나만 씁니다 — 같은 PC 브라우저의 다른 웹앱과 섞이지 않게)
- 저장하는 JSON 모양 **[가정]**:

| 칸 이름 | 뜻 | 형식 | 쓰는 페이지 | 읽는 페이지 |
|---|---|---|---|---|
| `docs` | 불러온 서류 목록 | 배열, 한 건 = `{id, type, name, issued}` (신청번호·신청유형·서류명·발급일 `YYYY-MM-DD`) | ② 기능 A | ③ 기능 B |
| `missing` | 누락 점검 결과 | 배열, 한 건 = `{id, type, lacks}` (`lacks` = 빠진 서류명 배열) | ② 기능 A | ① 시작 |
| `dateIssues` | 발급일 어긋남 결과 | 배열, 한 건 = `{id, name, issued, notice}` (`notice` = 가상 모집공고일) | ③ 기능 B | ① 시작 |
| `checks` | 판정하지 못한 행(확인 필요 — 시작 페이지 요약의 "확인 필요 n") | 배열, 한 건 = `{id, page, reason}` (`page` = `"A"` 또는 `"B"`) | ② 기능 A, ③ 기능 B | ① 시작 |

- 예시 1건: `{"docs":[{"id":"R-001","type":"일반","name":"주민등록등본","issued":"2026-10-28"}],"missing":[{"id":"R-003","type":"일반","lacks":["가족관계증명서"]}],"dateIssues":[{"id":"R-005","name":"주민등록등본","issued":"2026-09-30","notice":"2026-10-01"}],"checks":[{"id":"R-009","page":"B","reason":"발급일 형식 오류"}]}`
- **[가정]** ②가 CSV를 다시 불러오면 `docs`·`missing`과 `page:"A"`인 `checks`를 새로 쓰고, 이전 결과가 섞이지 않게 `dateIssues`와 `page:"B"`인 `checks`를 비웁니다.
- **[가정]** ③은 페이지를 열 때 자동으로 계산해 `dateIssues`와 `page:"B"`인 `checks`를 저장합니다(PRD S2 "이동하면 → 보인다").
- 표본 파일: `data/team_sample.csv` (가상, UTF-8) — 머리행 `신청번호,신청유형,서류명,발급일`, 서류 1건 = 1행, 70행(신청 20건)
- 일부러 넣은 함정: ④가 표본 PR에서 정하고 `tests/acceptance.md` AC4에 반영합니다. 함정 행은 `checks`로 가서 누락·어긋남 숫자와 따로 셉니다. 표본의 함정 4개:

| # | 위치(신청번호·서류명) | 넣은 값 | 가는 곳 |
|---|---|---|---|
| T1 | R-011 (서류 3행 모두) | 신청유형 `청년` — 필수서류표에 없는 유형 | `checks` `page:"A"` 1건(신청 단위) |
| T2 | R-006 · 소득확인서 | 발급일 빈 값 | `checks` `page:"B"` |
| T3 | R-016 · 주민등록등본 | 발급일 `2026.10.15` — `YYYY-MM-DD` 형식 아님 | `checks` `page:"B"` |
| T4 | R-020 · 무주택확인서 | 발급일 `2026-13-05` — 형식은 맞지만 없는 날짜 | `checks` `page:"B"` |

- 표본 기준값 **[가정]** (PRD 3-2 "구체 값은 ④가 표본과 함께 정해 2절에 적는다"):
  - 필수서류표(`docs_check.js` 상수): 일반 = 주민등록등본·가족관계증명서·소득확인서·무주택확인서 / 신혼부부 = 주민등록등본·가족관계증명서·혼인관계증명서·소득확인서·무주택확인서 / 고령자 = 주민등록등본·소득확인서·무주택확인서
  - 가상 모집공고일(`docs_date.js` 상수): `2026-10-01` — 당일과 그 뒤 발급은 유효, 그 전 발급은 발급일 어긋남
  - 표본 CSV는 UTF-8(BOM 있음 — 엑셀에서 한글이 깨지지 않게). ②는 머리행을 읽을 때 BOM을 뗀다

## 3. 공통 함수 (`tools/assets/common.js`, ①이 뼈대 PR에서 고정)

| 함수 | 넣는 것 | 돌려주는 것 · 하는 일 |
|---|---|---|
| `loadData()` | — | 2절 키의 JSON 전체(없으면 빈 모양 `{"docs":[],"missing":[],"dateIssues":[],"checks":[]}`) |
| `saveData(data)` | JSON 전체 | 2절 키에 통째로 저장 |
| `exportJson()` | — | JSON 백업 파일 내려받기 |
| `importJson(file)` | 백업 파일 | 읽어서 `saveData`. **[가정]** JSON이 아니거나 2절 칸이 없으면 저장하지 않고 알리고, 기존 데이터는 그대로 둠 |
| `clearData()` | — | 2절 키 지우기('비우기') |

모든 페이지는 이 함수로만 저장소를 씁니다. 그 밖의 함수(CSV 읽기, 대조, 날짜 비교 등)는 각 페이지 js에 둡니다.

## 4. 여는 방법

- 배포: GitHub Pages `https://cheonhae.github.io/LH_lab_team_prac_G_01/tools/index.html`
  - **[가정]** Pages는 기본 브랜치(현재 `master`)에서 배포하고, 설정은 사람이 합니다.
- 병합 전 확인: 브랜치 **Code → Download ZIP** → 압축을 풀고 `tools/index.html` 더블클릭
- 파일 검사: `python tests/run_acceptance.py`
