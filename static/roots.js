document.addEventListener("DOMContentLoaded", () => {
  const methodSelect = document.getElementById("methodSelect");
  const funcInput = document.getElementById("funcInput");

  const boundAField = document.getElementById("boundAField");
  const boundBField = document.getElementById("boundBField");
  const guessField = document.getElementById("guessField");
  const boundA = document.getElementById("boundA");
  const boundB = document.getElementById("boundB");
  const guessX0 = document.getElementById("guessX0");

  const tolerance = document.getElementById("tolerance");
  const maxIter = document.getElementById("maxIter");

  const calculateBtn = document.getElementById("calculateBtn");

  const emptyState = document.getElementById("emptyState");
  const loadingState = document.getElementById("loadingState");
  const resultsContent = document.getElementById("resultsContent");
  const finalRootBox = document.getElementById("finalRootBox");
  const iterTableHead = document.getElementById("iterTableHead");
  const iterTableBody = document.getElementById("iterTableBody");

  // Toggle fields based on method
  function updateFields() {
    const method = methodSelect.value;

    if (method === "bisection" || method === "false_position" || method === "fixed_point") {
      boundAField.style.display = "block";
      boundBField.style.display = "block";
      guessField.style.display = "none";
    } else if (method === "newton_raphson") {
      boundAField.style.display = "none";
      boundBField.style.display = "none";
      guessField.style.display = "block";
    } else {
      boundAField.style.display = "none";
      boundBField.style.display = "none";
      guessField.style.display = "none";
    }
  }

  methodSelect.addEventListener("change", updateFields);
  updateFields(); // Init

  // Render Table Headers
  function renderTableHeaders(method, data = {}) {
    iterTableHead.innerHTML = "";

    let headers = [];

    if (method === "bisection") {
      headers = ["n", "a", "b", "f(a)", "f(b)", "c = \\frac{a+b}{2}", "f(c)"];
    } else if (method === "false_position") {
      headers = ["n", "a", "b", "f(a)", "f(b)", "c = \\frac{a f(b) - b f(a)}{f(b) - f(a)}", "f(c)"];
    } else if (method === "newton_raphson") {
      const formulaStr = data.iter_formula_latex ? `x_{n+1} = ${data.iter_formula_latex}` : `x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)}`;
      headers = ["n", "x_n", formulaStr, "|x_{n+1} - x_n|"];
    } else if (method === "fixed_point") {
      const gFormula = data.g_latex ? `x_{n+1} = g(x_n) = ${data.g_latex.replace(/x/g, 'x_n')}` : `x_{n+1} = g(x_n)`;
      headers = ["n", "x_n", gFormula];
    }

    headers.forEach(h => {
      const th = document.createElement("th");
      try {
        katex.render(h, th);
      } catch (e) {
        th.innerText = h;
      }
      iterTableHead.appendChild(th);
    });
  }

  // Formats numbers as decimals
  function formatNumber(num) {
    if (num === null || num === undefined) return "-";
    const currentMethod = methodSelect.value;
    if (currentMethod === "fixed_point" || currentMethod === "false_position" || currentMethod === "bisection") {
      return num.toFixed(9);
    }
    return num.toFixed(5);
  }

  // Render Table Row
  function renderTableRow(row, method, isLast = false) {
    const tr = document.createElement("tr");

    const createTd = (val, highlight = null) => {
      const td = document.createElement("td");
      let displayStr = "-";
      if (typeof val === "number") {
        displayStr = formatNumber(val);
      } else if (val !== null && val !== undefined) {
        displayStr = String(val);
      }
      
      try {
        katex.render(displayStr, td);
      } catch (e) {
        td.innerText = displayStr;
      }
      if (highlight === 'green') {
        td.style.color = "var(--forward)";
        td.style.fontWeight = "bold";
      } else if (highlight === 'red') {
        td.style.color = "var(--error)";
        td.style.fontWeight = "bold";
      }
      return td;
    };

    if (method === "bisection" || method === "false_position") {
      const tdIter = document.createElement("td");
      tdIter.innerText = row.iteration;
      tr.appendChild(tdIter);

      tr.appendChild(createTd(row.a));
      tr.appendChild(createTd(row.b));
      tr.appendChild(createTd(row.f_a));
      tr.appendChild(createTd(row.f_b));
      tr.appendChild(createTd(row.c, isLast ? 'green' : null));
      tr.appendChild(createTd(row.f_c, isLast ? 'red' : null));
    } else if (method === "newton_raphson") {
      const n = row.iteration - 1;

      const tdN = document.createElement("td");
      tdN.textContent = n;
      tr.appendChild(tdN);

      const tdX = document.createElement("td");
      katex.render(`x_{${n}} = ${formatNumber(row.x)}`, tdX);
      tr.appendChild(tdX);

      const tdNextX = document.createElement("td");
      if (isLast) {
        tdNextX.style.color = "var(--forward)";
        tdNextX.style.fontWeight = "bold";
      }
      katex.render(`x_{${n + 1}} = ${formatNumber(row.x_next)}`, tdNextX);
      tr.appendChild(tdNextX);

      const tdErr = document.createElement("td");
      if (isLast) {
        tdErr.style.color = "var(--error)";
        tdErr.style.fontWeight = "bold";
      }
      katex.render(formatNumber(row.error), tdErr);
      tr.appendChild(tdErr);
    } else if (method === "fixed_point") {
      const iter = row.iteration;
      const prev_n = iter - 1;

      const tdN = document.createElement("td");
      tdN.textContent = prev_n;
      tr.appendChild(tdN);

      const tdX = document.createElement("td");
      katex.render(`x_{${prev_n}} = ${formatNumber(row.x)}`, tdX);
      tr.appendChild(tdX);

      const tdNextX = document.createElement("td");
      if (isLast) {
        tdNextX.style.color = "var(--forward)";
        tdNextX.style.fontWeight = "bold";
      }
      katex.render(`x_{${iter}} = ${formatNumber(row.g_x)}`, tdNextX);
      tr.appendChild(tdNextX);
    }

    return tr;
  }

  calculateBtn.addEventListener("click", async () => {
    const method = methodSelect.value;
    if (!method) {
      alert("Please choose a method first.");
      return;
    }

    const func = funcInput.value.trim();
    const a = boundA.value.trim();
    const b = boundB.value.trim();
    const x0 = guessX0.value.trim();
    const tol = tolerance.value.trim();
    const mIter = maxIter.value.trim();

    if (!func) {
      alert("Please enter a function f(x).");
      return;
    }

    const payload = {
      method: method,
      function: func,
      tolerance: tol || 1e-6,
      max_iterations: mIter || 50
    };

    if (method === "bisection" || method === "false_position" || method === "fixed_point") {
      if (a !== "") payload.a = parseFloat(a);
      if (b !== "") payload.b = parseFloat(b);
    } else if (method === "newton_raphson") {
      if (x0 !== "") payload.x0 = parseFloat(x0);
    }

    emptyState.style.display = "none";
    resultsContent.style.display = "none";
    loadingState.style.display = "flex";

    // Clear dynamic blocks
    const searchLogWrap = document.getElementById("searchLogWrap");
    const derivationWrap = document.getElementById("derivationWrap");
    if (searchLogWrap) {
      searchLogWrap.style.display = "none";
      searchLogWrap.innerHTML = "";
    }
    if (derivationWrap) {
      derivationWrap.style.display = "none";
      derivationWrap.innerHTML = "";
    }

    try {
      const response = await fetch("/api/roots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      loadingState.style.display = "none";
      resultsContent.style.display = "block";

      if (data.search_log && data.search_log.length > 0 && searchLogWrap) {
        searchLogWrap.style.display = "block";

        let successEntry = data.search_log.find(e => e.type === "compare" && e.fa * e.fb < 0);
        let exactEntry = null;
        if (!successEntry) {
          exactEntry = data.search_log.find(e => e.type === "eval" && e.fx === 0);
        }

        if (exactEntry) {
          searchLogWrap.innerHTML = `<div style="font-size: 15px;"><strong style="color: var(--forward);">Exact Root Found:</strong> f(${exactEntry.x}) = 0</div>`;
        } else if (successEntry) {
          const evalA = data.search_log.find(e => e.type === "eval" && e.x === successEntry.a);
          const evalB = data.search_log.find(e => e.type === "eval" && e.x === successEntry.b);

          let html = `<div style="font-size: 16px; line-height: 1.8;">`;
          html += `<div style="margin-bottom: 12px; font-weight: 600;">`;
          html += `<strong style="color: #c2185b;">Step 1:</strong> Find the function = <span id="drvStep1_fx"></span> from the given equation.<br>`;
          html += `Given That, <span id="givenEq"></span> = 0`;
          html += `</div>`;

          html += `<div style="margin-left: 32px; margin-bottom: 24px; font-style: italic;">`;
          html += `<div>∴ f(x) = <span id="letEq2"></span></div>`;
          html += `</div>`;

          html += `<div style="margin-bottom: 12px; font-weight: 600;">`;
          html += `<strong style="color: #c2185b;">Step 2:</strong> Choose two real numbers <span id="drvStep2_ab"></span> such that <span id="drvStep2_fafb"></span>.`;
          html += `</div>`;

          html += `<div style="margin-left: 32px; margin-bottom: 24px; font-style: italic;">`;
          html += `<div>For <span id="drvStep2_x1"></span>, <span id="drvStep2_fx1"></span></div>`;
          html += `<div>For <span id="drvStep2_x2"></span>, <span id="drvStep2_fx2"></span></div>`;
          html += `<div style="margin-top: 8px;">Since <span id="drvStep2_fA"></span> and <span id="drvStep2_fB"></span> are the opposite sign, so the root lies on <span id="drvStep2_interval"></span></div>`;
          html += `</div>`;

          searchLogWrap.innerHTML = html;

          try { katex.render(`f(x)`, document.getElementById("drvStep1_fx")); } catch (e) { }
          try { katex.render(data.f_latex, document.getElementById("givenEq")); } catch (e) { }
          try { katex.render(data.f_latex, document.getElementById("letEq2")); } catch (e) { }

          try { katex.render(`a \\text{ and } b`, document.getElementById("drvStep2_ab")); } catch (e) { }
          try { katex.render(`f(a) \\times f(b) < 0`, document.getElementById("drvStep2_fafb")); } catch (e) { }

          try { katex.render(`x = ${evalA.x}`, document.getElementById("drvStep2_x1")); } catch (e) { }
          let signA = evalA.fx > 0 ? "> 0" : "< 0";
          try { katex.render(`f(${evalA.x}) = ${evalA.sub_latex || data.f_latex} = ${formatNumber(evalA.fx)} ${signA}`, document.getElementById("drvStep2_fx1")); } catch (e) { }

          try { katex.render(`x = ${evalB.x}`, document.getElementById("drvStep2_x2")); } catch (e) { }
          let signB = evalB.fx > 0 ? "> 0" : "< 0";
          try { katex.render(`f(${evalB.x}) = ${evalB.sub_latex || data.f_latex} = ${formatNumber(evalB.fx)} ${signB}`, document.getElementById("drvStep2_fx2")); } catch (e) { }

          try { katex.render(`f(${evalA.x})`, document.getElementById("drvStep2_fA")); } catch (e) { }
          try { katex.render(`f(${evalB.x})`, document.getElementById("drvStep2_fB")); } catch (e) { }
          try { katex.render(`[${evalA.x}, ${evalB.x}]`, document.getElementById("drvStep2_interval")); } catch (e) { }
        } else {
          searchLogWrap.innerHTML = `<strong style="color: var(--error);">Search Failed:</strong> No interval satisfying f(a) × f(b) < 0 was found within the search range. Please provide explicit bounds.`;
        }
      }

      if (method === "fixed_point" && data.g_latex) {
        // We will merge derivation directly into searchLogWrap
        let dHtml = `<div style="font-size: 16px; line-height: 1.8;">`;

        let step4IntervalText = "";
        let intervalText = "";
        if (data.search_log) {
          let sEntry = data.search_log.find(e => e.type === "compare" && e.fa * e.fb < 0);
          if (sEntry) {
            intervalText = `\\quad \\text{for } (${sEntry.a}, ${sEntry.b})`;
            step4IntervalText = `x \\in (${sEntry.a}, ${sEntry.b})`;
          } else {
            intervalText = `\\quad \\text{for } x = ${data.x0_val}`;
            step4IntervalText = `x = ${data.x0_val}`;
          }
        }

        let successEntryFP = data.search_log ? data.search_log.find(e => e.type === "compare" && e.fa * e.fb < 0) : null;
        let exactEntry = (!successEntryFP && data.search_log) ? data.search_log.find(e => e.type === "eval" && e.fx === 0) : null;
        let sOffset = (data.search_log && data.search_log.length > 0 && !exactEntry) ? 2 : 0;
        dHtml += `<div style="margin-bottom: 12px; font-weight: 600;"><strong style="color: #c2185b;">Step ${sOffset + 1}:</strong> Converting from the given equation <span id="drvRewriteEq"></span> into the form of <span id="drvFormG"></span> .</div>`;

        dHtml += `<div style="margin-left: 32px; margin-bottom: 24px;">`;
        if (data.derivation_steps) {
          data.derivation_steps.forEach((step, idx) => {
            dHtml += `<div style="margin: 8px 0;"><span id="drvStep2_${idx}"></span></div>`;
          });
        }
        dHtml += `<div style="margin: 8px 0;"><span id="drvStep2Final"></span></div>`;
        dHtml += `</div>`;

        dHtml += `<div style="margin-bottom: 12px; font-weight: 600;"><strong style="color: #c2185b;">Step ${sOffset + 2}:</strong> Finding <span id="drvStep4Math1"></span> and <span id="drvStep4Math2"></span> for <span id="drvStep4Interval"></span></div>`;
        dHtml += `<div style="margin-left: 32px; margin-bottom: 24px;">`;
        dHtml += `<div style="margin: 8px 0;"><span id="drvStep3A"></span></div>`;
        dHtml += `<div style="margin: 8px 0;"><span id="drvStep3B"></span></div>`;
        dHtml += `<div style="margin: 8px 0;"><span id="drvStep3C"></span></div>`;

        dHtml += `<div style="margin: 8px 0;">At <span id="drvStep4ValueSub"></span> (in radian mode),</div>`;
        dHtml += `<div style="margin: 8px 0;"><span id="drvStep3D"></span></div>`;
        dHtml += `<div style="margin: 8px 0;"><span id="drvStep3E"></span></div>`;
        dHtml += `</div>`;

        dHtml += `<div style="margin-bottom: 24px; font-weight: 600;"><strong style="color: #c2185b;">Step ${sOffset + 3}:</strong> We take initial value, <span id="drvStep4X0"></span>, then successive approximation using fixed point iteration method are tabulated below.</div>`;

        dHtml += `</div>`;

        // Append to searchLogWrap to merge boxes
        if (searchLogWrap) {
          searchLogWrap.style.display = "block";
          const mergedDiv = document.createElement("div");
          mergedDiv.innerHTML = dHtml;
          searchLogWrap.appendChild(mergedDiv);
        }
        if (derivationWrap) {
          derivationWrap.style.display = "none";
        }

        try { katex.render(`f(x) = 0`, document.getElementById("drvRewriteEq")); } catch (e) { }
        try { katex.render(`x = g(x)`, document.getElementById("drvFormG")); } catch (e) { }
        try { katex.render(`g'(x)`, document.getElementById("drvStep4Math1")); } catch (e) { }
        try { katex.render(`|g'(x)| < 1`, document.getElementById("drvStep4Math2")); } catch (e) { }
        try { katex.render(step4IntervalText, document.getElementById("drvStep4Interval")); } catch (e) { }



        if (data.derivation_steps) {
          data.derivation_steps.forEach((step, idx) => {
            try { katex.render(`${step.prefix} ${step.content}`, document.getElementById(`drvStep2_${idx}`)); } catch (e) { }
          });
        }

        try { katex.render(`\\therefore g(x) = x = ${data.g_latex} \\dots\\dots\\dots (1)`, document.getElementById("drvStep2Final")); } catch (e) { }

        try { katex.render(`\\therefore g(x) = ${data.g_latex}`, document.getElementById("drvStep3A")); } catch (e) { }
        try { katex.render(`\\frac{d}{dx} g(x) = \\frac{d}{dx} \\left( ${data.g_latex} \\right) \\Rightarrow g'(x) = ${data.g_prime_latex}`, document.getElementById("drvStep3B")); } catch (e) { }
        try { katex.render(`\\therefore |g'(x)| = \\left| ${data.g_prime_latex} \\right|`, document.getElementById("drvStep3C")); } catch (e) { }

        try { katex.render(`x = x_0 = ${data.x0_val}`, document.getElementById("drvStep4ValueSub")); } catch (e) { }

        // Evaluate g_prime at x0 for visual display (substitution)
        try { katex.render(`= \\left| ${formatNumber(data.g_prime_x0_val)} \\right| ${intervalText}`, document.getElementById("drvStep3D")); } catch (e) { }

        let eqStr = data.g_prime_x0_val < 1 ? "< 1" : "\\ge 1";
        try { katex.render(`\\therefore |g'(x)| = ${formatNumber(data.g_prime_x0_val)} ${eqStr} ${intervalText}`, document.getElementById("drvStep3E")); } catch (e) { }

        try { katex.render(`x = x_0 = ${data.x0_val}`, document.getElementById("drvStep4X0")); } catch (e) { }
      } else if (method === "newton_raphson") {
        let dHtml = `<div style="font-size: 16px; line-height: 1.8;">`;
        let successEntryNR = data.search_log ? data.search_log.find(e => e.type === "compare" && e.fa * e.fb < 0) : null;
        let exactEntry = (!successEntryNR && data.search_log) ? data.search_log.find(e => e.type === "eval" && e.fx === 0) : null;
        let sOffset = (data.search_log && data.search_log.length > 0 && !exactEntry) ? 2 : 0;
        
        dHtml += `<div style="margin-bottom: 12px; font-weight: 600;"><strong style="color: #c2185b;">Step ${sOffset + 1}:</strong> Apply the Newton-Raphson formula</div>`;
        dHtml += `<div style="margin-left: 32px; margin-bottom: 24px;">`;
        dHtml += `<div style="margin: 8px 0;">Here, <span id="drvStep3_f_prime"></span></div>`;
        dHtml += `<div style="margin: 8px 0;">So, <span id="drvStep3A_NR"></span></div>`;
        dHtml += `</div>`;
        
        dHtml += `<div style="margin-bottom: 24px; font-weight: 600;"><strong style="color: #c2185b;">Step ${sOffset + 2}:</strong> Now putting <span id="drvStep4N_NR"></span> and let the initial value <span id="drvStep4X0_NR"></span>, then successive approximation using Newton-Raphson method are tabulated below.</div>`;
        dHtml += `</div>`;

        if (searchLogWrap) {
          searchLogWrap.style.display = "block";
          const mergedDiv = document.createElement("div");
          mergedDiv.innerHTML = dHtml;
          searchLogWrap.appendChild(mergedDiv);
        }
        if (derivationWrap) {
          derivationWrap.style.display = "none";
        }
        
        let fStr = `x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)}`;
        if (data.iter_formula_latex) {
             fStr += ` \\Rightarrow x_{n+1} = ${data.iter_formula_latex}`;
        }
        try { katex.render(`\\frac{d}{dx} f(x) = \\frac{d}{dx} \\left( ${data.f_latex} \\right) \\Rightarrow f'(x) = ${data.f_prime_latex}`, document.getElementById("drvStep3_f_prime")); } catch(e){}
        try { katex.render(fStr, document.getElementById("drvStep3A_NR")); } catch(e){}
        try { katex.render(`n = 0`, document.getElementById("drvStep4N_NR")); } catch(e){}
        try { katex.render(`x_0 = ${formatNumber(data.x0_val)}`, document.getElementById("drvStep4X0_NR")); } catch(e){}
      }

      if (data.error) {
        finalRootBox.innerHTML = `<span style="color: var(--error);">Error: ${data.error}</span>`;
        iterTableHead.innerHTML = "";
        iterTableBody.innerHTML = "";
        return;
      }

      const mathEqContainer = document.getElementById("mathEquations");
      if (mathEqContainer) {
        mathEqContainer.style.display = "none";
      }

      const finalDiffBox = document.getElementById("finalDifferenceBox");
      if (finalDiffBox) {
        finalDiffBox.style.display = "none";
        finalDiffBox.innerHTML = "";
      }

      if (method === "fixed_point" && data.iterations.length > 0) {
        const lastIter = data.iterations[data.iterations.length - 1];
        const n = lastIter.iteration;
        const prev_n = n - 1;

        finalRootBox.innerHTML = `Root =&nbsp; <strong>${formatNumber(data.root)}</strong>`;

        if (finalDiffBox) {
          finalDiffBox.style.display = "block";
          finalDiffBox.innerHTML = `<span id="drvDiffFinal"></span>`;
          try { katex.render(`\\therefore |x_{${n}} - x_{${prev_n}}| = ${formatNumber(lastIter.error)}`, document.getElementById("drvDiffFinal")); } catch (e) { }
        }
      } else {
        finalRootBox.innerHTML = `Root =&nbsp; <strong>${formatNumber(data.root)}</strong>`;
      }
      renderTableHeaders(method, data);
      iterTableBody.innerHTML = "";

      data.iterations.forEach((row, index) => {
        const isLast = index === data.iterations.length - 1;
        iterTableBody.appendChild(renderTableRow(row, method, isLast));
      });


    } catch (err) {
      loadingState.style.display = "none";
      resultsContent.style.display = "block";
      finalRootBox.innerHTML = `<span style="color: var(--error);">Failed to connect to server.</span>`;
    }
  });
});

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
