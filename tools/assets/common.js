/* 공통 저장 함수 — docs/design.md 2절(키·JSON 모양)·3절(함수)과 같게.
   ① 통합·화면 담당만 고칩니다. 이 파일에는 저장 함수만 둡니다.
   모든 페이지는 이 함수로만 저장소를 씁니다. */

var STORAGE_KEY = "teamG3_app";
var DATA_FIELDS = ["docs", "missing", "dateIssues", "checks"];

function emptyData() {
  return { docs: [], missing: [], dateIssues: [], checks: [] };
}

/* 2절 키의 JSON 전체. 없거나 읽을 수 없으면 빈 모양, 빠진 칸은 빈 배열로 채운다. */
function loadData() {
  var data = emptyData();
  var text = window.localStorage.getItem(STORAGE_KEY);
  if (!text) return data;
  try {
    var saved = JSON.parse(text);
    DATA_FIELDS.forEach(function (f) {
      if (saved && Array.isArray(saved[f])) data[f] = saved[f];
    });
  } catch (e) {
    /* 깨진 값은 빈 모양으로 본다 */
  }
  return data;
}

/* JSON 전체를 2절 키에 통째로 저장 */
function saveData(data) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* JSON 백업 파일 내려받기 (브라우저 안에서만 만든다) */
function exportJson() {
  var blob = new Blob([JSON.stringify(loadData(), null, 2)], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "teamG3_backup.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* 백업 파일을 읽어 saveData. JSON이 아니거나 2절 칸이 없으면 저장하지 않고 기존 데이터를 둔다.
   Promise를 돌려준다(성공: 저장한 데이터, 실패: 안내 문구). */
function importJson(file) {
  return new Promise(function (resolve, reject) {
    var bad = "백업 파일 형식이 맞지 않습니다";
    if (!file) { reject(bad); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var data;
      try {
        data = JSON.parse(reader.result);
      } catch (e) {
        reject(bad);
        return;
      }
      var ok = data && typeof data === "object" &&
        DATA_FIELDS.every(function (f) { return Array.isArray(data[f]); });
      if (!ok) { reject(bad); return; }
      var clean = emptyData();
      DATA_FIELDS.forEach(function (f) { clean[f] = data[f]; });
      saveData(clean);
      resolve(clean);
    };
    reader.onerror = function () { reject(bad); };
    reader.readAsText(file, "utf-8");
  });
}

/* 2절 키 지우기('비우기') */
function clearData() {
  window.localStorage.removeItem(STORAGE_KEY);
}
