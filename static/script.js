const SUPERSCRIPTS = { 0: "", 1: "", 2: "\u00b2", 3: "\u00b3", 4: "\u2074", 5: "\u2075",
  6: "\u2076", 7: "\u2077", 8: "\u2078", 9: "\u2079" };

let selectedMethod = "auto";

// ------------------------------------------------------------------
// Row management
// ------------------------------------------------------------------
const pointsBody = document.getElementById("pointsBody");

function addRow(x = "", y = "") {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" class="x-input" inputmode="decimal" value="${x}"></td>
    <td><input type="text" class="y-input" inputmode="decimal" value="${y}"></td>
    <td><button type="button" class="remove-row" aria-label="Remove point">&times;</button></td>
  `;
  tr.querySelector(".remove-row").addEventListener("click", () => {
    if (pointsBody.children.length > 2) tr.remove();
  });
  pointsBody.appendChild(tr);
}

document.getElementById("addRow").addEventListener("click", () => addRow());

document.getElementById("loadExample").addEventListener("click", () => {
  pointsBody.innerHTML = "";

  const scenario = Math.floor(Math.random() * 3); // 0 = Forward, 1 = Backward, 2 = Divided
  const isEqual = scenario !== 2;
  const startX = Math.floor(Math.random() * 10) - 5;
  const numPoints = Math.floor(Math.random() * 3) + 4;

  const example = [];
  let currentX = startX;
  const step = Math.floor(Math.random() * 3) + 1;

  for (let i = 0; i < numPoints; i++) {
    const y = Math.floor(Math.random() * 200) - 100;
    example.push([currentX, y]);

    if (isEqual) {
      currentX += step;
    } else {
      // Random unequal jump between 1 and 4
      currentX += Math.floor(Math.random() * 4) + 1;
    }
  }

  example.forEach(([x, y]) => addRow(x, y));

  const minX = example[0][0];
  const maxX = example[example.length - 1][0];
  let randomTarget;

  if (scenario === 0) {
    // Forward: target near the start (first 30%)
    randomTarget = minX + Math.random() * ((maxX - minX) * 0.3);
  } else if (scenario === 1) {
    // Backward: target near the end (last 30%)
    randomTarget = maxX - Math.random() * ((maxX - minX) * 0.3);
  } else {
    // Divided: anywhere
    randomTarget = minX + Math.random() * (maxX - minX);
  }

  document.getElementById("targetX").value = randomTarget.toFixed(1);
});

function populateTableData(pairs) {
  if (!pairs || pairs.length === 0) return;
  pointsBody.innerHTML = "";
  pairs.forEach(([x, y]) => addRow(x, y));
}

document.getElementById("pointsTable").addEventListener("paste", (e) => {
  const text = (e.clipboardData || window.clipboardData).getData("text");
  if (!text) return;

  const lines = text.split(/\r?\n/);
  const pairs = [];
  let isTabular = false;

  for (const line of lines) {
    if (!line.trim()) continue;
    const separator = line.includes("\t") ? "\t" : (line.includes(",") ? "," : " ");
    const parts = line.split(separator).filter(s => s.trim() !== "").map(s => s.trim());

    if (parts.length >= 2) {
      isTabular = true;
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      if (!isNaN(x) && !isNaN(y)) {
        pairs.push([x, y]);
      }
    }
  }

  if (isTabular && pairs.length >= 2) {
    e.preventDefault();
    populateTableData(pairs);
    document.getElementById("errorMsg").hidden = true;
  }
});

// seed with 4 starter rows
[[0, ""], [1, ""], [2, ""], [3, ""]].forEach(() => addRow());

document.getElementById("clearData").addEventListener("click", () => {
  pointsBody.innerHTML = "";
  [[0, ""], [1, ""], [2, ""], [3, ""]].forEach(() => addRow());
  const targetXInput = document.getElementById("targetX");
  if (targetXInput) targetXInput.value = "";
  
  if (chart) {
    chart.data.datasets.forEach(d => d.data = []);
    chart.update();
  }
  
  const resultsContent = document.getElementById("resultsContent");
  if (resultsContent) resultsContent.style.display = "none";
  
  const emptyState = document.getElementById("emptyState");
  if (emptyState) emptyState.style.display = "flex";
  
  const errorMsg = document.getElementById("errorMsg");
  if (errorMsg) errorMsg.hidden = true;
});

// ------------------------------------------------------------------
// Method toggle
// ------------------------------------------------------------------
document.querySelectorAll(".method-opt").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".method-opt").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedMethod = btn.dataset.method;
  });
});

// ------------------------------------------------------------------
// Calculate
// ------------------------------------------------------------------
document.getElementById("calcBtn").addEventListener("click", async () => {
  const errorMsg = document.getElementById("errorMsg");
  errorMsg.hidden = true;

  const xValues = Array.from(document.querySelectorAll(".x-input")).map(i => i.value.trim());
  const yValues = Array.from(document.querySelectorAll(".y-input")).map(i => i.value.trim());
  const targetX = document.getElementById("targetX").value.trim();

  if (xValues.some(v => v === "") || yValues.some(v => v === "")) {
    showError("Please fill in every x and y value.");
    return;
  }

  try {
    const res = await fetch("/api/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        x_values: xValues,
        y_values: yValues,
        x_target: targetX,
        method: selectedMethod,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "Something went wrong.");
      return;
    }
    renderResults(data);
  } catch (err) {
    showError("Could not reach the server. Is app.py running?");
  }
});

function showError(msg) {
  const errorMsg = document.getElementById("errorMsg");
  errorMsg.textContent = msg;
  errorMsg.hidden = false;
}

// ------------------------------------------------------------------
// Render results
// ------------------------------------------------------------------
function renderResults(data) {
  window.__lastData = data;
  document.getElementById("emptyState").hidden = true;
  const content = document.getElementById("resultsContent");
  content.hidden = false;

  const isSymbolic = !!data.symbolic_mode;
  const isLagrange = data.method === "lagrange" || isSymbolic;

  document.getElementById("diffTableHeading").hidden = isLagrange;
  document.getElementById("diffTableNote").hidden = isLagrange;
  document.getElementById("diffTableContainer").hidden = isLagrange;

  const stepsHeading = document.getElementById("stepsHeading");
  if (stepsHeading) stepsHeading.hidden = false;
  document.getElementById("stepsWrap").hidden = false;

  const formulaHeading = document.getElementById("formulaHeading");
  const formulaWrap = document.getElementById("formulaWrap");
  if (formulaHeading && formulaWrap && data.general_formula_latex) {
    formulaHeading.hidden = false;
    formulaWrap.hidden = false;
    formulaWrap.innerHTML = "";
    
    const formulaRow = document.createElement("div");
    formulaRow.className = "formula-card";
    formulaRow.style.marginBottom = "20px";
    formulaRow.style.padding = "16px";
    formulaRow.style.background = "var(--paper)";
    formulaRow.style.borderRadius = "8px";
    formulaRow.style.border = "1px solid var(--rule)";
    formulaRow.style.justifyContent = "center";
    
    katex.render(data.general_formula_latex, formulaRow, { throwOnError: false, displayMode: true });
    formulaWrap.appendChild(formulaRow);
  } else {
    if (formulaHeading) formulaHeading.hidden = true;
    if (formulaWrap) formulaWrap.hidden = true;
  }

  const summaryBlock = document.querySelector(".result-summary");
  if (summaryBlock) summaryBlock.hidden = isSymbolic;
  const pFormEl = document.getElementById("pFormula");
  pFormEl.hidden = isSymbolic;

  if (!isSymbolic) {
    const methodLabel = data.method === "forward" ? "Forward" :
                        data.method === "backward" ? "Backward" :
                        data.method === "lagrange" ? "Lagrange" :
                        "Divided Difference (Auto)";
    const methodEl = document.getElementById("methodUsed");
    methodEl.textContent = methodLabel;
    methodEl.className = "summary-value " + (data.method === "divided_difference" ? "forward" : data.method);

    document.getElementById("hValue").textContent = data.h;
    document.getElementById("pValue").textContent = data.p;

    if (data.method === "divided_difference" || data.method === "lagrange") {
      katex.render(data.p_formula, pFormEl, { throwOnError: false });
    } else {
      katex.render("\\Large p = " + data.p_formula + " = " + data.p, pFormEl, { throwOnError: false });
    }

    if (!isLagrange) {
      renderDiffTable(data);
    }

    katex.render(`f(${data.x_target}) \\approx ${data.result}`, document.getElementById("finalAnswer"), { throwOnError: false, displayMode: true });
  } else {
    katex.render(data.latex_poly, document.getElementById("finalAnswer"), { throwOnError: false, displayMode: true });
  }

  renderSteps(data);
  renderChart(data);
}

function renderDiffTable(data) {
  const wrap = document.getElementById("diffTableWrap");
  wrap.innerHTML = "";

  const n = data.table.length;
  const pathSet = new Set(data.path.map(([r, c]) => `${r}-${c}`));

  const grid = document.createElement("div");
  grid.className = "diff-table-grid";
  grid.style.gridTemplateColumns = `minmax(80px, max-content) minmax(80px, max-content) repeat(${n - 1}, minmax(80px, max-content))`;
  // Let CSS grid auto-size rows to support the triangular layout

  // header row
  addCell(grid, "x", 1, 1, "head");
  addCell(grid, "y", 1, 2, "head");
  for (let j = 1; j < n; j++) {
    if (data.method === "divided_difference") {
      addCell(grid, "Diff " + j, 1, j + 2, "head");
    } else {
      addCell(grid, "\u0394/\u2207" + (j > 1 ? SUPERSCRIPTS[j] || j : ""), 1, j + 2, "head");
    }
  }

  // data rows
  for (let i = 0; i < n; i++) {
    addCell(grid, formatNum(data.x_values[i]), 2 * i + 2, 1, "xcol");
    for (let j = 0; j < n - i; j++) {
      const isPath = pathSet.has(`${i}-${j}`);
      const methodClass = data.method === "divided_difference" ? "forward" : data.method;
      const cls = isPath ? `path ${methodClass}` : "";
      addCell(grid, formatNum(data.table[i][j]), 2 * i + j + 2, j + 2, cls, i, j);
    }
  }

  wrap.appendChild(grid);

  // draw path line connecting the highlighted diagonal
  requestAnimationFrame(() => drawPathLine(grid, data));
}

function addCell(grid, text, row, col, extraClass = "", r = null, c = null) {
  const div = document.createElement("div");
  div.className = "diff-cell " + extraClass;
  div.textContent = text;
  div.style.gridRow = row;
  div.style.gridColumn = col;
  if (r !== null) { div.dataset.row = r; div.dataset.col = c; }
  grid.appendChild(div);
}

function drawPathLine(grid, data) {
  const existing = grid.querySelector(".path-svg");
  if (existing) existing.remove();

  const rect = grid.getBoundingClientRect();
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "path-svg");
  svg.setAttribute("width", grid.scrollWidth);
  svg.setAttribute("height", grid.scrollHeight);

  const points = data.path.map(([r, c]) => {
    const cell = grid.querySelector(`.diff-cell[data-row="${r}"][data-col="${c}"]`);
    if (!cell) return null;
    const cr = cell.getBoundingClientRect();
    return [cr.left - rect.left + cr.width / 2, cr.top - rect.top + cr.height / 2];
  }).filter(Boolean);

  if (points.length > 1) {
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    poly.setAttribute("points", points.map(p => p.join(",")).join(" "));
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke-width", "2");
    poly.setAttribute("stroke-dasharray", "5 4");
    poly.setAttribute("class", "path-line " + data.method);
    svg.appendChild(poly);
  }

  grid.appendChild(svg);
}

function renderSteps(data) {
  const wrap = document.getElementById("stepsWrap");
  wrap.innerHTML = "";

  // Formula is now rendered in renderResults to separate it from step-by-step substitution

  data.terms.forEach(term => {
    const row = document.createElement("div");
    row.className = "step-row";

    let latexStr = "";
    if (data.symbolic_mode) {
      latexStr = `${term.label} = ${term.latexStr}`;
    } else {
      if (term.order === 0 && data.method !== "lagrange") {
        latexStr = `${term.label} = ${formatNum(term.diff_value)}`;
      } else {
        let p_factor = term.p_factor_desc;
        if (!p_factor.includes("\\frac") && p_factor !== "1") {
           latexStr = `${p_factor} \\cdot ${term.label} = ${formatNum(term.coeff)} \\cdot ${formatNum(term.diff_value)} = ${formatNum(term.term_value)}`;
        } else {
           latexStr = `\\left[${p_factor}\\right] \\cdot ${term.label} = ${formatNum(term.coeff)} \\cdot ${formatNum(term.diff_value)} = ${formatNum(term.term_value)}`;
        }
      }
    }

    const ord = document.createElement("div");
    ord.className = "step-order";
    ord.textContent = `Term ${term.order}`;

    const expr = document.createElement("div");
    expr.className = "step-expr";
    if (data.symbolic_mode) {
      expr.style.overflowX = "auto";
    }
    katex.render(latexStr, expr, { throwOnError: false });

    const total = document.createElement("div");
    total.className = "step-total";
    if (data.symbolic_mode) {
      katex.render(`\\Sigma = ${term.running_total_latex}`, total, { throwOnError: false });
    } else {
      katex.render(`\\Sigma = ${formatNum(term.running_total)}`, total, { throwOnError: false });
    }

    row.appendChild(ord);
    row.appendChild(expr);
    row.appendChild(total);

    wrap.appendChild(row);
  });
}

function formatNum(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (Number.isInteger(v)) return v.toString();
  return Number(v.toFixed(6)).toString();
}

window.addEventListener("resize", () => {
  const grid = document.querySelector(".diff-table-grid");
  if (grid && window.__lastData) drawPathLine(grid, window.__lastData);
});

// ------------------------------------------------------------------
// Chart.js Visualization
// ------------------------------------------------------------------
let interpolationChart = null;

function renderChart(data) {
  const ctx = document.getElementById("interpolationChart");
  if (!ctx) return;

  if (interpolationChart) {
    interpolationChart.destroy();
  }

  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const gridColor = isDark ? "#2b3035" : "#d9ddd3";
  const textColor = isDark ? "#888888" : "#5b6459";
  const lineColor = isDark ? "#e2e8f0" : "#202b23";
  const forwardColor = isDark ? "#eab308" : "#a6702a";
  const backwardColor = isDark ? "#818cf8" : "#4a5fa8";

  const yRange = data.y_max_data - data.y_min_data;
  // If all y values are identical, yRange is 0. Give it a small buffer.
  const safeRange = yRange === 0 ? 1 : yRange;
  const suggestedMin = data.y_min_data - safeRange * 0.5;
  const suggestedMax = data.y_max_data + safeRange * 0.5;

  const rungeShadingPlugin = {
    id: 'rungeShading',
    beforeDraw: (chart) => {
      const {ctx, chartArea: {top, bottom, left, right, width, height}, scales: {x}} = chart;

      const xMinData = data.x_values[0];
      const xMaxData = data.x_values[data.x_values.length - 1];

      const startPixel = Math.max(left, Math.min(right, x.getPixelForValue(xMinData)));
      const endPixel = Math.max(left, Math.min(right, x.getPixelForValue(xMaxData)));

      ctx.save();

      // Left Danger Zone (Red)
      ctx.fillStyle = isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)';
      if (startPixel > left) {
        ctx.fillRect(left, top, startPixel - left, height);
      }

      // Center Safe Zone (Green)
      ctx.fillStyle = isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.08)';
      if (endPixel > startPixel) {
        ctx.fillRect(startPixel, top, endPixel - startPixel, height);
      }

      // Right Danger Zone (Red)
      ctx.fillStyle = isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)';
      if (right > endPixel) {
        ctx.fillRect(endPixel, top, right - endPixel, height);
      }

      ctx.restore();
    }
  };

  const userPoints = data.x_values.map((x, i) => ({ x: x, y: data.y_values[i] }));

  const datasets = [
    {
      label: 'Newton Polynomial',
      data: data.curve,
      borderColor: lineColor,
      borderWidth: 2,
      pointRadius: 0,
      fill: false,
      tension: 0
    },
    {
      label: 'Given Data',
      data: userPoints,
      backgroundColor: forwardColor,
      borderColor: forwardColor,
      pointRadius: 6,
      pointHoverRadius: 8,
      showLine: false
    }
  ];

  if (!data.symbolic_mode) {
    datasets.push({
      label: 'Interpolated Result',
      data: [{ x: data.x_target, y: data.result }],
      backgroundColor: backwardColor,
      borderColor: backwardColor,
      pointRadius: 10,
      pointStyle: 'crossRot',
      borderWidth: 3,
      showLine: false
    });
  }

  interpolationChart = new Chart(ctx.getContext("2d"), {
    type: 'line',
    data: { datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          grid: { color: gridColor },
          ticks: { color: textColor }
        },
        y: {
          suggestedMin: suggestedMin,
          suggestedMax: suggestedMax,
          grid: { color: gridColor },
          ticks: { color: textColor }
        }
      },
      plugins: {
        legend: { labels: { color: textColor, font: { family: 'Inter' } } },
        tooltip: {
          callbacks: {
            label: function(context) {
              return '(' + context.parsed.x.toFixed(4) + ', ' + context.parsed.y.toFixed(4) + ')';
            }
          }
        }
      }
    },
    plugins: [rungeShadingPlugin]
  });
}

// ------------------------------------------------------------------
// Theme Toggle
// ------------------------------------------------------------------
const singleThemeBtn = document.getElementById("singleThemeBtn");

function applyTheme(theme) {
  let actualTheme = theme;
  if (theme === "system") {
    actualTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", actualTheme);

  if (singleThemeBtn) {
    // The SVGs are handled entirely via CSS based on the data-theme attribute
  }

  if (window.__lastData) {
    renderChart(window.__lastData);
  }
}


const savedTheme = localStorage.getItem("newton_theme") || "light";
applyTheme(savedTheme);

// ------------------------------------------------------------------
// Mobile Navigation Toggle
// ------------------------------------------------------------------
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileNav = document.getElementById("mobileNav");
if (mobileMenuBtn && mobileNav) {
  mobileMenuBtn.addEventListener("click", () => {
    mobileNav.classList.toggle("open");
  });
}

if (singleThemeBtn) {
  singleThemeBtn.addEventListener("click", () => {
    let activeTheme = document.documentElement.getAttribute("data-theme");
    let newTheme = activeTheme === "dark" ? "light" : "dark";
    localStorage.setItem("newton_theme", newTheme);
    applyTheme(newTheme);
  });
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (localStorage.getItem("newton_theme") === "system") {
    applyTheme("system");
  }
});
