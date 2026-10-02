# hyunji.crabit

원장님용 이벤트 자료 메이커 모음. GitHub Pages로 배포.

| 경로 | 내용 |
|---|---|
| `10.02_snack_event/` | 시험기간 간식 약봉투 PDF 메이커 (2026-10-02) |

## 10.02_snack_event
- 원본 도안: `~/Downloads/약봉투 이벤트 템플릿.pdf` (A4 가로 842.25 x 595.5pt). `envelope.js` 좌표가 이 도안과 1:1.
- `art/*.png`: 힉스필드 Recraft V4.1로 만든 2톤 흑백 일러스트(톤 5종 x 2장). 브라우저에서 브랜드 컬러로 재채색.
- 실시간 AI 그림은 선택 기능. `worker/hf-proxy.js` 배포 후 `config.js`의 `aiEndpoint`에 주소를 넣으면 켜짐.
- 서버 없음. PDF(jsPDF), ZIP(JSZip), 엑셀(SheetJS) 모두 브라우저에서 처리해 학생 이름이 밖으로 나가지 않음.
