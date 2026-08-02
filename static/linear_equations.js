document.addEventListener("DOMContentLoaded", () => {
  const methodSelect = document.getElementById("methodSelect");
  const numVariablesSelect = document.getElementById("numVariables");
  const matrixContainer = document.getElementById("matrixContainer");
  const seidelSettings = document.getElementById("seidelSettings");
  const guessContainer = document.getElementById("guessContainer");
  const calculateBtn = document.getElementById("calculateBtn");

  const emptyState = document.getElementById("emptyState");
  const loadingState = document.getElementById("loadingState");
  const resultsContent = document.getElementById("resultsContent");
  const stepsWrap = document.getElementById("stepsWrap");
  const iterationTableContainer = document.getElementById("iterationTableContainer");
  const iterTableHead = document.getElementById("iterTableHead");
  const iterTableBody = document.getElementById("iterTableBody");

  const varNames = ['x', 'y', 'z', 'w', 'v'];

  // Initialize Matrix Inputs
  function initMatrix() {
    const n = parseInt(numVariablesSelect.value);
    
    // Build Matrix A | B
    let html = `<div style="display: grid; gap: 8px; grid-template-columns: repeat(${n + 1}, minmax(80px, 1fr)); align-items: center;">`;
    
    // Headers
    for (let j = 0; j < n; j++) {
      html += `<div style="text-align: center; font-weight: 600; font-family: var(--font-mono); font-size: 14px; margin-bottom: 4px;">${varNames[j]}</div>`;
    }
    html += `<div style="text-align: center; font-weight: 600; font-family: var(--font-mono); font-size: 14px; margin-bottom: 4px; padding-left: 8px; border-left: 2px solid var(--rule);">B</div>`;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        html += `<input type="number" step="any" id="cell_${i}_${j}" class="x-input" style="text-align: right;" value="${Math.floor(Math.random() * 30) + 1}">`;
      }
      html += `<div style="padding-left: 8px; border-left: 2px solid var(--rule);"><input type="number" step="any" id="cell_${i}_b" class="y-input" style="text-align: right; width: 100%;" value="${Math.floor(Math.random() * 30) + 1}"></div>`;
    }
    html += `</div>`;
    matrixContainer.innerHTML = html;

    // Initial Guesses (for Gauss-Seidel)
    let guessHtml = "";
    for (let j = 0; j < n; j++) {
      guessHtml += `<div style="flex: 1; min-width: 80px; display: flex; align-items: center; gap: 4px;">
        <span style="font-family: var(--font-mono); font-size: 14px; font-weight: 600;">${varNames[j]}₀</span>
        <input type="number" step="any" id="guess_${j}" class="x-input" value="0">
      </div>`;
    }
    guessContainer.innerHTML = guessHtml;
  }

  function updateMethod() {
    const method = methodSelect.value;
    if (method === "gauss_seidel" || method === "jacobi") {
      seidelSettings.style.display = "block";
    } else {
      seidelSettings.style.display = "none";
    }
  }

  numVariablesSelect.addEventListener("change", initMatrix);
  methodSelect.addEventListener("change", updateMethod);
  const loadExampleBtn = document.getElementById("loadExample");
  if (loadExampleBtn) {
    loadExampleBtn.addEventListener("click", initMatrix);
  }
  
  const clearBtn = document.getElementById("clearBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
       const inputs = document.querySelectorAll("#matrixContainer input, #guessContainer input");
       inputs.forEach(input => input.value = "");
    });
  }

  initMatrix();
  updateMethod();

  // Helper: Format Number
  function fmt(num) {
    if (Number.isInteger(num)) return num.toString();
    return Number(num.toFixed(4)).toString();
  }

  // Helper: Format Matrix for LaTeX
  function matrixToLatex(A, B, highlightRow = -1) {
    let latex = "\\begin{bmatrix}\n";
    for (let i = 0; i < A.length; i++) {
      let rowStr = A[i].map(v => fmt(v)).join(" & ");
      rowStr += ` & | & ${fmt(B[i])}`;
      if (i === highlightRow) {
         // rudimentary way to highlight row in katex, \rowcolor is not supported fully, just text color
         rowStr = `\\textcolor{#2980b9}{${A[i].map(v => fmt(v)).join("} & \\textcolor{#2980b9}{")}} & | & \\textcolor{#2980b9}{${fmt(B[i])}}`;
      }
      latex += rowStr + " \\\\\n";
    }
    latex += "\\end{bmatrix}";
    return latex;
  }

  // Solvers
  function solveGaussJordan(A, B) {
    const n = A.length;
    let steps = [];
    
    // Copy arrays to avoid mutating originals
    let a = A.map(row => [...row]);
    let b = [...B];

    steps.push({
      desc: "Initial Augmented Matrix:",
      latex: matrixToLatex(a, b)
    });

    for (let i = 0; i < n; i++) {
      // 1. Partial Pivoting
      let maxEl = Math.abs(a[i][i]);
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(a[k][i]) > maxEl) {
          maxEl = Math.abs(a[k][i]);
          maxRow = k;
        }
      }

      if (maxEl === 0) {
        return { error: "Matrix is singular or near singular." };
      }

      if (maxRow !== i) {
        // Swap rows
        [a[i], a[maxRow]] = [a[maxRow], a[i]];
        [b[i], b[maxRow]] = [b[maxRow], b[i]];
        steps.push({
          desc: `Swap Row ${i + 1} and Row ${maxRow + 1} (Partial Pivoting):`,
          latex: matrixToLatex(a, b, i)
        });
      }

      // 2. Normalize Pivot Row
      let pivot = a[i][i];
      if (pivot !== 1 && pivot !== 0) {
        for (let j = i; j < n; j++) {
           a[i][j] /= pivot;
        }
        b[i] /= pivot;
        steps.push({
          desc: `Row ${i + 1} &larr; Row ${i + 1} / (${fmt(pivot)}) (Normalize Pivot):`,
          latex: matrixToLatex(a, b, i)
        });
      }

      // 3. Eliminate all other rows in current column
      for (let k = 0; k < n; k++) {
        if (k === i) continue;
        let factor = a[k][i];
        if (factor !== 0) {
          for (let j = i; j < n; j++) {
            a[k][j] -= factor * a[i][j];
          }
          b[k] -= factor * b[i];
          steps.push({
            desc: `Row ${k + 1} &larr; Row ${k + 1} - (${fmt(factor)}) &times; Row ${i + 1}:`,
            latex: matrixToLatex(a, b, k)
          });
        }
      }
    }

    let roots = b.map(val => fmt(val));
    return { roots, steps, method: "Gauss Jordan Elimination" };
  }

  function solveGaussSeidel(A, B, x0, tol, maxIter, isJacobi) {
    if (maxIter > 5000) maxIter = 5000;
    const n = A.length;
    let x = [...x0];
    let iterations = [];
    let steps = [];

    let A_latex = "\\begin{pmatrix} " + A.map(row => row.map(v => fmt(v)).join(" & ")).join(" \\\\ ") + " \\end{pmatrix}";
    let X_latex = "\\begin{pmatrix} " + varNames.slice(0, n).join(" \\\\ ") + " \\end{pmatrix}";
    let B_latex = "\\begin{pmatrix} " + B.map(v => fmt(v)).join(" \\\\ ") + " \\end{pmatrix}";

    let initialLatex = `A = ${A_latex}, \\quad X = ${X_latex}, \\quad B = ${B_latex}`;
    if (n > 3) {
       initialLatex = `\\begin{aligned} A &= ${A_latex} \\\\[8pt] X &= ${X_latex} \\\\[8pt] B &= ${B_latex} \\end{aligned}`;
    }
    steps.push({
      desc: "Note: Initial System (AX = B):",
      latex: initialLatex
    });

    // Step 1: Check strict diagonal dominance
    let isDominant = true;
    let domSteps = [];
    for (let i = 0; i < n; i++) {
       let diag = Math.abs(A[i][i]);
       let sum = 0;
       let sumStr = [];
       for (let j = 0; j < n; j++) {
          if (i !== j) {
             sum += Math.abs(A[i][j]);
             sumStr.push(`|${fmt(A[i][j])}|`);
          }
       }
       let relation = diag > sum ? ">" : (diag === sum ? "=" : "<");
       if (diag <= sum) isDominant = false;
       if (n > 3) {
          domSteps.push(`\\begin{aligned} &|a_{${i+1}${i+1}}| = ${fmt(diag)} \\\\ &\\sum |a_{${i+1}j}| = ${sumStr.join(" + ")} = ${fmt(sum)} \\\\ &\\implies ${fmt(diag)} ${relation} ${fmt(sum)} \\end{aligned}`);
       } else {
          domSteps.push(`|a_{${i+1}${i+1}}| = ${fmt(diag)} ${relation} \\sum |a_{${i+1}j}| = ${sumStr.join(" + ")} = ${fmt(sum)}`);
       }
    }

    steps.push({
      desc: "Step 1: Check Strict Diagonal Dominance:",
      latex: domSteps.join(" \\\\[8pt] \n") + "\\\\[12pt] \\text{" + (isDominant ? "Matrix is strictly diagonally dominant." : "Matrix is NOT strictly diagonally dominant.") + "}"
    });

    if (!isDominant) {
      let newA = [];
      let newB = [];
      let used = new Array(n).fill(false);
      let canMakeDominant = true;
      let perm = [];
      
      for (let i = 0; i < n; i++) {
         let found = false;
         for (let r = 0; r < n; r++) {
            if (used[r]) continue;
            let diag = Math.abs(A[r][i]);
            let sum = 0;
            for (let c = 0; c < n; c++) {
               if (c !== i) sum += Math.abs(A[r][c]);
            }
            if (diag > sum) {
               newA[i] = [...A[r]];
               newB[i] = B[r];
               used[r] = true;
               found = true;
               perm.push(r);
               break;
            }
         }
         if (!found) {
            canMakeDominant = false;
            break;
         }
      }
      
      if (canMakeDominant) {
         A = newA;
         B = newB;

         let currentOrder = [];
         for(let i=0; i<n; i++) currentOrder.push(i);
         let swapLatexStrs = [];
         
         for (let i = 0; i < n; i++) {
            let targetOld = perm[i];
            let currentIdx = currentOrder.indexOf(targetOld);
            if (currentIdx !== i) {
               swapLatexStrs.push(`R_{${i+1}} \\leftrightarrow R_{${currentIdx+1}}`);
               let temp = currentOrder[i];
               currentOrder[i] = currentOrder[currentIdx];
               currentOrder[currentIdx] = temp;
            }
         }
         
         let finalLatexStr = matrixToLatex(A, B);
         if (swapLatexStrs.length > 0) {
            let swapStr = `\\textcolor{#4caf50}{${swapLatexStrs.join("; \\quad ")}${swapLatexStrs.length > 0 ? ';' : ''}}`;
            finalLatexStr = swapStr + " \\\\[12pt] \n" + finalLatexStr;
         }

         steps.push({
            desc: "Step 1.1: Rearranged rows to achieve strict diagonal dominance:",
            latex: finalLatexStr
         });
      } else {
         steps.push({
            desc: "Note: Could not rearrange rows to make it strictly diagonally dominant. The method may not converge.",
            latex: ""
         });
      }
    }
    // Show equations formulation (Old way: Step 2)
    let eqStepsOld = [];
    for (let i = 0; i < n; i++) {
       let eqStr = `${varNames[i]} = \\frac{${fmt(B[i])}`;
       for (let j = 0; j < n; j++) {
         if (i !== j) {
           let sign = A[i][j] >= 0 ? "-" : "+";
           eqStr += ` ${sign} ${fmt(Math.abs(A[i][j]))}${varNames[j]}`;
         }
       }
       eqStr += `}{${fmt(A[i][i])}}`;
       eqStepsOld.push(eqStr);
    }
    steps.push({
      desc: "Step 2: Isolate each variable:",
      latex: eqStepsOld.join(" \\\\[8pt] \n")
    });

    // Show iterative formulation (New way: Step 3)
    let eqStepsIterative = [];
    for (let i = 0; i < n; i++) {
       let leftVar = `${varNames[i]}^{(k)}`;
       let diagTerm = fmt(A[i][i]);
       let fractionPrefix = `\\frac{1}{${diagTerm}}`;
       if (diagTerm === "1") fractionPrefix = "";
       else if (diagTerm === "-1") fractionPrefix = "-";

       let rhsInner = `${fmt(B[i])}`;
       for (let j = 0; j < n; j++) {
         if (i !== j) {
           let sign = A[i][j] >= 0 ? "-" : "+";
           let val = fmt(Math.abs(A[i][j]));
           if (val === "1") val = "";
           let sup = isJacobi ? "^{(k-1)}" : (j < i ? "^{(k)}" : "^{(k-1)}");
           rhsInner += ` ${sign} ${val}${varNames[j]}${sup}`;
         }
       }
       
       let eqStr = `${leftVar} = ${fractionPrefix} \\left( ${rhsInner} \\right)`;
       eqStepsIterative.push(eqStr);
    }
    steps.push({
      desc: "Step 3: Formulate Iterative Equations:",
      latex: eqStepsIterative.join(" \\\\[8pt] \n")
    });

    let header = ["n"];
    for(let i=0; i<n; i++) header.push(varNames[i]);
    header.push("Error");

    // Prepare Step 4 content
    let step4LatexArr = [];
    let initValsStr = [];
    for(let i=0; i<n; i++) {
       initValsStr.push(`${varNames[i]}^{(0)} = ${fmt(x0[i])}`);
    }
    step4LatexArr.push(`\\begin{aligned} & \\text{Take the initial values } ${initValsStr.join(", ")} \\text{ and set } k=1 \\text{ for iteration-1.} \\end{aligned}`);

    let prevX = [...x];
    for (let k = 1; k <= maxIter; k++) {
      let maxErr = 0;
      let newX = [...x]; // Temporary array for Jacobi
      let iterEqs = [];
      for (let i = 0; i < n; i++) {
        let sum = B[i];
        
        let leftVar, fractionPrefix, rhsFormula, rhsSubst;
        if (k <= 10) {
          leftVar = `${varNames[i]}^{(${k})}`;
          let diagTerm = fmt(A[i][i]);
          fractionPrefix = `\\frac{1}{${diagTerm}}`;
          if (diagTerm === "1") fractionPrefix = "";
          else if (diagTerm === "-1") fractionPrefix = "-";
          rhsFormula = `${fmt(B[i])}`;
          rhsSubst = `${fmt(B[i])}`;
        }
        
        for (let j = 0; j < n; j++) {
          if (i !== j) {
            let usedVal = isJacobi ? prevX[j] : newX[j];
            sum -= A[i][j] * usedVal;
            
            if (k <= 10) {
              let sign = A[i][j] >= 0 ? "-" : "+";
              let val = fmt(Math.abs(A[i][j]));
              if (val === "1") val = "";
              let sup = isJacobi ? `^{(${k-1})}` : (j < i ? `^{(${k})}` : `^{(${k-1})}`);
              rhsFormula += ` ${sign} ${val}${varNames[j]}${sup}`;
              
              let numValStr = fmt(usedVal);
              if(numValStr.startsWith("-")) numValStr = `(${numValStr})`;
              let multSign = val === "" ? "" : val + " \\times ";
              rhsSubst += ` ${sign} ${multSign}${numValStr}`;
            }
          }
        }
        let newXi = sum / A[i][i];
        
        if (k <= 10) {
          iterEqs.push(`${leftVar} = ${fractionPrefix} \\left( ${rhsFormula} \\right) = ${fractionPrefix} \\left( ${rhsSubst} \\right) = ${fmt(newXi)}`);
        }
        
        let err = Math.abs(newXi - prevX[i]);
        if (err > maxErr) maxErr = err;
        newX[i] = newXi;
      }
      
      if (k <= 10) {
        let iterHeader = `& \\textcolor{#1e3799}{\\text{Iteration - ${k} (putting }} k=${k} \\textcolor{#1e3799}{\\text{):}}`;
        let iterEqsAligned = iterEqs.map(eq => "& " + eq);
        let iterStr = `\\begin{aligned} ${iterHeader} \\\\[8pt] \n` + iterEqsAligned.join(" \\\\[8pt] \n") + ` \\end{aligned}`;
        step4LatexArr.push(iterStr);
      } else if (k === 11) {
        step4LatexArr.push(`\\text{... (Further iteration steps are hidden for performance, see table below)}`);
      }
      
      x = [...newX];

      iterations.push({
         n: k,
         vals: [...x],
         err: maxErr
      });

      let match2Dec = true;
      for (let i = 0; i < n; i++) {
        if (newX[i].toFixed(2) !== prevX[i].toFixed(2)) {
           match2Dec = false;
           break;
        }
      }

      if (match2Dec || maxErr < tol) {
        break;
      }
      
      if (!isFinite(maxErr) || maxErr > 1e15) {
        iterations.diverged = true;
        break;
      }
      
      prevX = [...x];
    }

    steps.push({
       desc: "Step 4: Iterations",
       latex: step4LatexArr
    });

    if (iterations.diverged) {
       steps.push({
         desc: "Note: Method diverged (numbers grew too large). The system cannot be solved using this method as the matrix is not diagonally dominant.",
         latex: ""
       });
    } else if (iterations.length === maxIter && iterations[maxIter-1].err > tol) {
       steps.push({
         desc: "Note: Method did not converge within max iterations. Matrix may not be diagonally dominant.",
         latex: ""
       });
    }

    let roots = x.map(val => fmt(val));
    return { roots, steps, method: isJacobi ? "Gauss Jacobi Elimination" : "Gauss Seidal Elimination", iterations, header };
  }


  // Calculate Button Click
  calculateBtn.addEventListener("click", () => {
    const n = parseInt(numVariablesSelect.value);
    const method = methodSelect.value;
    
    let A = [];
    let B = [];
    for (let i = 0; i < n; i++) {
      let row = [];
      for (let j = 0; j < n; j++) {
        let val = parseFloat(document.getElementById(`cell_${i}_${j}`).value);
        if (isNaN(val)) val = 0;
        row.push(val);
      }
      A.push(row);
      let bVal = parseFloat(document.getElementById(`cell_${i}_b`).value);
      if (isNaN(bVal)) bVal = 0;
      B.push(bVal);
    }

    emptyState.style.display = "none";
    resultsContent.style.display = "none";
    loadingState.style.display = "flex";

    // Simulate slight delay for UX
    setTimeout(() => {
      loadingState.style.display = "none";
      resultsContent.style.display = "block";

      let result;
      if (method === "gauss_jordan") {
        result = solveGaussJordan(A, B);
      } else if (method === "gauss_seidel" || method === "jacobi") {
        let x0 = [];
        for (let j = 0; j < n; j++) {
           let val = parseFloat(document.getElementById(`guess_${j}`).value);
           if (isNaN(val)) val = 0;
           x0.push(val);
        }
        let tol = parseFloat(document.getElementById("tolerance").value) || 0.0001;
        let mIter = parseInt(document.getElementById("maxIter").value) || 50;
        let isJacobi = method === "jacobi";
        result = solveGaussSeidel(A, B, x0, tol, mIter, isJacobi);
      }

      if (result.error) {
        stepsWrap.innerHTML = `<div style="color: var(--error); font-weight: 600;">Error: ${result.error}</div>`;
        iterationTableContainer.style.display = "none";
        return;
      }

      // Render Steps
      stepsWrap.innerHTML = "";
      if (result.steps) {
        result.steps.forEach((step, idx) => {
          let stepDiv = document.createElement("div");
          stepDiv.style.marginBottom = "24px";
          let descDiv = document.createElement("div");
          descDiv.style.fontWeight = "600";
          descDiv.style.marginBottom = "8px";
          let descText = step.desc;
          if (descText.startsWith("Note:")) {
            descDiv.innerHTML = `<span style="color: var(--warning);">Note:</span> ${descText.substring(5).trim()}`;
          } else if (descText.startsWith("Step ") || descText.startsWith("Iteration")) {
            descDiv.innerHTML = descText.replace(/^(Step [\d.]+:|Iteration - \d+)/, '<span style="color: #e74c3c;">$1</span>');
          } else {
            descDiv.innerHTML = `<span style="color: #e74c3c;">Step ${idx + 1}:</span> ${descText}`;
          }
          stepDiv.appendChild(descDiv);

          let latexArray = Array.isArray(step.latex) ? step.latex : (step.latex ? [step.latex] : []);
          latexArray.forEach((latexStr, index) => {
            let mathDiv = document.createElement("div");
            mathDiv.style.padding = "16px";
            mathDiv.style.background = "var(--surface)";
            mathDiv.style.borderRadius = "8px";
            mathDiv.style.border = "1px solid var(--rule)";
            mathDiv.style.overflowX = "auto";
            mathDiv.style.width = "100%";
            mathDiv.style.boxSizing = "border-box";
            if (index > 0) mathDiv.style.marginTop = "16px";
            let isStep4 = step.desc && step.desc.includes("Step 4:");
            try {
               katex.render(latexStr, mathDiv, { displayMode: true, fleqn: isStep4 });
            } catch(e) {
               mathDiv.innerText = "Error rendering math: " + e.message;
            }
            stepDiv.appendChild(mathDiv);
          });
          stepsWrap.appendChild(stepDiv);
        });
      }

      // Render Final Answer Box
      const finalAnswerContainer = document.getElementById("finalAnswerContainer");
      const finalAnswerBox = document.getElementById("finalAnswerBox");
      
      let divergedOrFailed = false;
      if (result.iterations && result.iterations.diverged) divergedOrFailed = true;
      if (result.iterations && result.iterations.length === maxIter && result.iterations[maxIter-1].err > tol) divergedOrFailed = true;
      
      if (!divergedOrFailed && result.roots && result.roots.length > 0) {
        finalAnswerContainer.style.display = "block";
        let finalLatex = "";
        if (n <= 3) {
           let rootStrs = [];
           for(let i=0; i<n; i++) {
             rootStrs.push(`${varNames[i]} = \\textcolor{#e74c3c}{${result.roots[i]}}`);
           }
           finalLatex = rootStrs.join(" \\quad \\text{and} \\quad ");
        } else {
           let alignStrs = [];
           for(let i=0; i<n; i++) alignStrs.push(`${varNames[i]} &= \\textcolor{#e74c3c}{${result.roots[i]}}`);
           finalLatex = `\\begin{aligned} ${alignStrs.join(" \\\\ ")} \\end{aligned}`;
        }
        
        try {
           katex.render(finalLatex, finalAnswerBox, { displayMode: true });
        } catch(e) {
           finalAnswerBox.innerText = finalLatex;
        }
      } else {
        finalAnswerContainer.style.display = "none";
      }

      // Render Table (Gauss-Seidel & Jacobi)
      if (method === "gauss_seidel" || method === "jacobi") {
        iterationTableContainer.style.display = "block";
        iterTableHead.innerHTML = "";
        iterTableBody.innerHTML = "";
        
        result.header.forEach(h => {
          let th = document.createElement("th");
          try { katex.render(h, th); } catch(e) { th.innerText = h; }
          iterTableHead.appendChild(th);
        });

        result.iterations.forEach(row => {
           let tr = document.createElement("tr");
           let tdN = document.createElement("td");
           tdN.innerText = row.n;
           tr.appendChild(tdN);

           row.vals.forEach(v => {
              let td = document.createElement("td");
              td.innerText = fmt(v);
              tr.appendChild(td);
           });

           let tdErr = document.createElement("td");
           tdErr.innerText = fmt(row.err);
           tr.appendChild(tdErr);
           iterTableBody.appendChild(tr);
        });
      } else {
        iterationTableContainer.style.display = "none";
      }

    }, 300);
  });
});
