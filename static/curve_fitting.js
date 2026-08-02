let selectedMethod = "best_fit";

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
  
  const type = Math.floor(Math.random() * 5); // 0: linear, 1: polynomial, 2: exponential, 3: logarithmic, 4: power
  const numPoints = Math.floor(Math.random() * 4) + 5;
  let currentX = 1;
  const example = [];

  for (let i = 0; i < numPoints; i++) {
    let y = 0;
    if (type === 0) {
        y = 2.0 * currentX + 5.0 + (Math.random() * 4 - 2);
    } else if (type === 1) {
        y = 1.5 * currentX * currentX - 0.5 * currentX + 3 + (Math.random() * 5 - 2.5);
    } else if (type === 2) {
        y = 2.5 * Math.exp(0.5 * currentX) + (Math.random() * 2 - 1);
    } else if (type === 3) {
        y = 3.0 * Math.log(currentX) + 2.0 + (Math.random() * 1.5 - 0.75);
    } else if (type === 4) {
        y = 2.0 * Math.pow(currentX, 1.5) + (Math.random() * 2 - 1);
    }
    example.push([currentX.toFixed(1), y.toFixed(2)]);
    currentX += (Math.random() * 1.5 + 0.5);
  }

  example.forEach(([x, y]) => addRow(x, y));
  
  const targetXInput = document.getElementById("targetX");
  if (targetXInput) {
      targetXInput.value = (1 + Math.random() * (currentX - 1)).toFixed(2);
  }
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

// seed with 5 starter rows
[["", ""], ["", ""], ["", ""], ["", ""], ["", ""]].forEach(([x, y]) => addRow(x, y));

document.getElementById("clearData").addEventListener("click", () => {
  pointsBody.innerHTML = "";
  [["", ""], ["", ""], ["", ""], ["", ""], ["", ""]].forEach(([x, y]) => addRow(x, y));
  const targetXInput = document.getElementById("targetX");
  if (targetXInput) targetXInput.value = "";
  
  if (chart) {
    chart.data.datasets.forEach(d => d.data = []);
    chart.update();
  }
  document.getElementById("resultsContent").style.display = "none";
  document.getElementById("emptyState").style.display = "flex";
  document.getElementById("errorMsg").hidden = true;
});

// ------------------------------------------------------------------
// Method toggle
// ------------------------------------------------------------------
document.querySelectorAll(".method-opt").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".method-opt").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedMethod = btn.dataset.method;
    
    const polyWrap = document.getElementById("polyDegreeWrap");
    if (polyWrap) {
      polyWrap.style.display = selectedMethod === "polynomial" ? "block" : "none";
    }
    
    const linearWrap = document.getElementById("linearFormWrap");
    if (linearWrap) {
      linearWrap.style.display = selectedMethod === "linear" ? "block" : "none";
    }

    const expWrap = document.getElementById("expFormWrap");
    if (expWrap) {
      expWrap.style.display = selectedMethod === "exponential" ? "block" : "none";
    }
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
  const targetX = document.getElementById("targetX") ? document.getElementById("targetX").value.trim() : "";

  if (xValues.some(v => v === "") || yValues.some(v => v === "")) {
    showError("Please fill in every x and y value.");
    return;
  }

  try {
    const res = await fetch("/api/curve-fitting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        x_values: xValues,
        y_values: yValues,
        method: selectedMethod,
        x_target: targetX,
        degree: document.getElementById("polyDegree") ? parseInt(document.getElementById("polyDegree").value) : 2,
        linear_form: document.getElementById("linearForm") ? document.getElementById("linearForm").value : "ax+b",
        exp_form: document.getElementById("expForm") ? document.getElementById("expForm").value : "ae^bx"
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

  const methodLabelMap = {
      "linear": "Linear Fit",
      "quadratic": "Quadratic Fit",
      "exponential": "Exponential Fit",
      "logarithmic": "Logarithmic Fit",
      "power": "Power Fit"
  };

  let methodUsedStr = methodLabelMap[data.method] || data.method;
  if (data.best_fit_selected) {
      methodUsedStr = `Best Fit (${methodUsedStr})`;
  }

  document.getElementById("methodUsed").textContent = methodUsedStr;
  document.getElementById("rSquaredValue").textContent = data.r_squared.toFixed(6);

  const formulaWrap = document.getElementById("formulaWrap");
  formulaWrap.innerHTML = "";
  katex.render(data.equation, formulaWrap, { throwOnError: false, displayMode: true });

  const stepsWrap = document.getElementById("stepsWrap");
  if (stepsWrap) {
      stepsWrap.innerHTML = "";
      if (data.derivation_steps && data.derivation_steps.length > 0) {
          stepsWrap.style.display = "block";
          const sectionLabel = document.createElement("h3");
          sectionLabel.className = "section-label";
          sectionLabel.textContent = "Step-by-step Derivation";
          stepsWrap.appendChild(sectionLabel);
          
          const box = document.createElement("div");
          box.style.background = "var(--surface)";
          box.style.padding = "16px";
          box.style.borderRadius = "8px";
          box.style.border = "1px solid var(--rule)";
          box.style.lineHeight = "1.8";
          
          data.derivation_steps.forEach(step => {
              const el = document.createElement("div");
              if (step.type === "text") {
                  el.innerHTML = step.content.replace(/\$(.*?)\$/g, (m, g1) => katex.renderToString(g1, {throwOnError: false}));
                  el.style.marginBottom = "8px";
              } else if (step.type === "math") {
                  katex.render(step.content, el, { throwOnError: false, displayMode: true });
                  el.style.marginBottom = "12px";
              } else if (step.type === "table") {
                  const tableWrap = document.createElement("div");
                  tableWrap.className = "table-container";
                  tableWrap.style.marginBottom = "16px";
                  tableWrap.style.marginTop = "12px";
                  tableWrap.style.overflowX = "auto";
                  
                  const table = document.createElement("table");
                  table.className = "data-table";
                  table.style.width = "100%";
                  
                  const thead = document.createElement("thead");
                  const headRow = document.createElement("tr");
                  step.headers.forEach(h => {
                      const th = document.createElement("th");
                      th.innerHTML = h.replace(/\$(.*?)\$/g, (m, g1) => katex.renderToString(g1, {throwOnError: false}));
                      th.style.textAlign = "center";
                      headRow.appendChild(th);
                  });
                  thead.appendChild(headRow);
                  table.appendChild(thead);
                  
                  const tbody = document.createElement("tbody");
                  step.rows.forEach(r => {
                      const row = document.createElement("tr");
                      r.forEach(cell => {
                          const td = document.createElement("td");
                          td.innerHTML = katex.renderToString(cell, {throwOnError: false});
                          td.style.textAlign = "center";
                          row.appendChild(td);
                      });
                      tbody.appendChild(row);
                  });
                  table.appendChild(tbody);
                  
                  if (step.footers) {
                      const tfoot = document.createElement("tfoot");
                      const footRow = document.createElement("tr");
                      footRow.style.background = "var(--surface-sunken)";
                      footRow.style.fontWeight = "600";
                      step.footers.forEach(f => {
                          const td = document.createElement("td");
                          td.innerHTML = katex.renderToString(f, {throwOnError: false});
                          td.style.textAlign = "center";
                          td.style.padding = "10px";
                          td.style.borderTop = "2px solid var(--rule)";
                          footRow.appendChild(td);
                      });
                      tfoot.appendChild(footRow);
                      table.appendChild(tfoot);
                  }
                  
                  tableWrap.appendChild(table);
                  el.appendChild(tableWrap);
              }
              box.appendChild(el);
          });
          stepsWrap.appendChild(box);
      } else {
          stepsWrap.style.display = "none";
      }
  }

  const estimateBox = document.getElementById("estimateResultBox");
  if (estimateBox) {
      if (data.estimated_y !== undefined && data.estimated_y !== null) {
          estimateBox.style.display = "block";
          let subText = data.equation_substituted ? ` = ${data.equation_substituted}` : "";
          katex.render(`f(${data.x_target})${subText} \\approx ${data.estimated_y.toFixed(4)}`, estimateBox, { throwOnError: false, displayMode: true });
      } else {
          estimateBox.style.display = "none";
      }
  }

  renderChart(data);
}

// ------------------------------------------------------------------
// Chart.js Visualization
// ------------------------------------------------------------------
let curveChart = null;

function renderChart(data) {
  const ctx = document.getElementById("curveChart");
  if (!ctx) return;

  if (curveChart) {
    curveChart.destroy();
  }

  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const gridColor = isDark ? "#2b3035" : "#d9ddd3";
  const textColor = isDark ? "#888888" : "#5b6459";
  const lineColor = isDark ? "#818cf8" : "#4a5fa8";
  const dataColor = isDark ? "#eab308" : "#a6702a";

  const userPoints = data.x_values.map((x, i) => ({ x: x, y: data.y_values[i] }));
  
  // Sort data points for the fit curve just in case
  const curvePoints = [...data.curve].sort((a, b) => a.x - b.x);

  const datasets = [
    {
      label: 'Fitted Curve',
      data: curvePoints,
      type: 'line',
      borderColor: lineColor,
      borderWidth: 2,
      pointRadius: 0,
      fill: false,
      tension: 0
    },
    {
      label: 'Data Points',
      data: userPoints,
      backgroundColor: dataColor,
      borderColor: dataColor,
      pointRadius: 6,
      pointHoverRadius: 8,
      showLine: false
    }
  ];

  if (data.x_target !== undefined && data.estimated_y !== undefined && data.estimated_y !== null) {
    const estimatedColor = isDark ? "#22c55e" : "#16a34a"; // green
    datasets.push({
      label: 'Estimated Point',
      data: [{ x: data.x_target, y: data.estimated_y }],
      backgroundColor: estimatedColor,
      borderColor: estimatedColor,
      pointRadius: 10,
      pointHoverRadius: 12,
      pointStyle: 'crossRot',
      borderWidth: 3,
      showLine: false
    });
  }

  curveChart = new Chart(ctx.getContext("2d"), {
    type: 'scatter',
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
    }
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
