const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const DEFAULT_RULES = {
  "الأحد": ["OFF", "PM", "AM"],
  "الاثنين": ["PM", "AM", "PM"],
  "الثلاثاء": ["AM", "PM", "OFF"],
  "الأربعاء": ["PM", "AM", "AM"],
  "الخميس": ["PM", "OFF", "AM"],
  "الجمعة": ["AM", "PM", "PM"],
  "السبت": ["AM", "PM", "OFF"]
};
const STORAGE_KEY = "shiftManagerV1";
let employees = ["Emp1", "Emp2", "Emp3"];
let rules = structuredClone(DEFAULT_RULES);
let shifts = {};
let start = "2026-11-21", end = "2026-12-20";
const $ = id => document.getElementById(id);
const status = msg => $("saveStatus").textContent = msg;
function parseNames() { return $("employeeNames").value.split(/[،,]/).map(x => x.trim()).filter(Boolean) }
function isoDate(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` }
function datesBetween(a, b) { let out = []; let d = new Date(a + "T12:00:00"), last = new Date(b + "T12:00:00"); while (d <= last) { out.push(new Date(d)); d.setDate(d.getDate() + 1) } return out }
function dayName(d) { return DAYS[d.getDay()] }
function shiftClass(v) { return v.toLowerCase() }
function save() { const data = { employees, rules, shifts, start, end }; localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); status("تم الحفظ تلقائيًا ✓") }
function load() { try { const d = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (d) { employees = d.employees || employees; rules = { ...rules, ...d.rules }; shifts = d.shifts || {}; start = d.start || start; end = d.end || end } } catch (e) { } }
function renderRules() {
  let html = `<thead><tr><th>اليوم</th>${employees.map(n => `<th>${escapeHtml(n)}</th>`).join("")}</tr></thead><tbody>`;
  DAYS.forEach(day => { html += `<tr><td><b>${day}</b></td>` + employees.map((_, i) => `<td><select data-day="${day}" data-emp="${i}">${["AM", "PM", "OFF"].map(v => `<option ${rules[day]?.[i] === v ? "selected" : ""}>${v}</option>`).join("")}</select></td>`).join("") + "</tr>" });
  $("rulesTable").innerHTML = html + "</tbody>";
  $("rulesTable").querySelectorAll("select").forEach(s => s.addEventListener("change", e => { let { day, emp } = e.target.dataset; rules[day][+emp] = e.target.value; generate(false) }));
}
function generate(show = true) {
  employees = parseNames(); if (!employees.length) { alert("أدخل اسم موظف واحد على الأقل."); return }
  start = $("startDate").value; end = $("endDate").value;
  if (!start || !end || start > end) { alert("تأكد من صحة تاريخ البداية والنهاية."); return }
  renderRules();
  datesBetween(start, end).forEach(d => {
    const key = isoDate(d), day = dayName(d); shifts[key] = shifts[key] || {};
    employees.forEach((name, i) => { shifts[key][name] = rules[day]?.[i] || "OFF" });
  });
  Object.keys(shifts).forEach(k => { if (k < start || k > end) delete shifts[k] });
  renderSchedule(); save(); if (show) status("تم إنشاء الجدول وحفظه ✓");
}
function renderSchedule() {
  const days = datesBetween(start, end);
  $("periodLabel").textContent = `${formatDate(start)} – ${formatDate(end)}`;
  $("dayCount").textContent = `${days.length} يومًا`;
  let html = `<thead><tr><th>اليوم</th><th>التاريخ</th>${employees.map(n => `<th>${escapeHtml(n)}</th>`).join("")}</tr></thead><tbody>`;
  days.forEach(d => {
    let key = isoDate(d), day = dayName(d); html += `<tr><td><b>${day}</b></td><td>${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</td>`;
    employees.forEach(name => { let v = shifts[key]?.[name] || "OFF"; html += `<td><button class="shift ${shiftClass(v)}" data-date="${key}" data-name="${escapeAttr(name)}" aria-label="تغيير وردية ${escapeAttr(name)}">${v}</button></td>` }); html += "</tr>"
  });
  $("scheduleTable").innerHTML = html + "</tbody>";
  $("scheduleTable").querySelectorAll(".shift").forEach(btn => btn.addEventListener("click", () => { let opts = ["AM", "PM", "OFF"], cur = opts.indexOf(btn.textContent), next = opts[(cur + 1) % 3]; shifts[btn.dataset.date][btn.dataset.name] = next; btn.textContent = next; btn.className = `shift ${shiftClass(next)}`; save() }));
}
function formatDate(s) { return new Date(s + "T12:00:00").toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" }) }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])) }
function escapeAttr(s) { return escapeHtml(s) }
async function exportCSV() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Shift Manager";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Shift Schedule", {
    views: [{ state: "normal" }]
  });

  // Columns
  worksheet.columns = [
    { header: "Day", key: "day", width: 18 },
    { header: "Date", key: "date", width: 16 },
    ...employees.map(name => ({
      header: name,
      key: name,
      width: 18
    }))
  ];

  // Header styling
  const header = worksheet.getRow(1);
  header.height = 30;

  header.eachCell(cell => {
    cell.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
      size: 12
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F2937" }
    };

    cell.alignment = {
      horizontal: "center",
      vertical: "middle"
    };

    cell.border = {
      top: { style: "medium", color: { argb: "FF64748B" } },
      left: { style: "medium", color: { argb: "FF64748B" } },
      bottom: { style: "medium", color: { argb: "FF64748B" } },
      right: { style: "medium", color: { argb: "FF64748B" } }
    };
  });

  // Add schedule rows
  const days = datesBetween(start, end);

  days.forEach(d => {
    const key = isoDate(d);

    const rowData = {
      day: dayName(d),
      date: key
    };

    employees.forEach(name => {
      rowData[name] = shifts[key]?.[name] || "OFF";
    });

    const row = worksheet.addRow(rowData);

    row.height = 25;

    row.eachCell(cell => {
      cell.alignment = {
        horizontal: "center",
        vertical: "middle"
      };

      if (cell.col === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF6B7280" }
        };
        cell.font = {
          bold: true,
          color: { argb: "FFFFFFFF" }
        };
      } else if (cell.col === 2) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF374151" }
        };
        cell.font = {
          bold: true,
          color: { argb: "FFFFFFFF" }
        };
      }

      cell.border = {
        bottom: {
          style: "thin",
          color: { argb: "FFE5E7EB" }
        }
      };
    });

    // Shift colors
    employees.forEach(name => {
      const cell = row.getCell(
        employees.indexOf(name) + 3
      );

      const value = cell.value;

      if (value === "AM") {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF91B886" }
        };
        cell.font = {
          bold: true,
          color: { argb: "FF292F29" }
        };
      }

      else if (value === "PM") {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD46464" }
        };
        cell.font = {
          bold: true,
          color: { argb: "FFFFFFFF" }
        };
      }

      else if (value === "OFF") {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFA7925F" }
        };
        cell.font = {
          bold: true,
          color: { argb: "FFFFFFFF" }
        };
      }
    });
  });

  // Add autofilter
  worksheet.autoFilter = {
    from: "A1",
    to: worksheet.getRow(1).getCell(employees.length + 2).address
  };

  // Download Excel file
  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = `Shift_Schedule_${start}_to_${end}.xlsx`;
  a.click();

  URL.revokeObjectURL(url);
}
$("generateBtn").addEventListener("click", () => generate(true));
$("saveBtn").addEventListener("click", () => { employees = parseNames(); save(); renderRules(); renderSchedule() });
$("exportBtn").addEventListener("click", exportCSV);
$("printBtn").addEventListener("click", () => window.print());
load();
$("employeeNames").value = employees.join("، ");
$("startDate").value = start; $("endDate").value = end;
if (!Object.keys(shifts).length) { generate(false) } else { renderRules(); renderSchedule() }
