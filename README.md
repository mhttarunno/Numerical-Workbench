# Numerical Workbench 🧮

A modern, high-performance web application built for **Numerical Methods** coursework and academic presentations. **Numerical Workbench** provides textbook-style, step-by-step mathematical derivations, interactive visualizations, and automated matrix conditioning for four core domains of numerical analysis.

---

## 🌟 Key Features & Modules

### 1. 🎯 Root Finding Methods
- **Supported Algorithms**: Bisection Method, False Position (Regula Falsi), Newton-Raphson, and Fixed-Point Iteration.
- **Smart Auto-Bracketing**: Automatically discovers a valid initial interval $[a, b]$ where $f(a) \cdot f(b) < 0$ if bounds are not provided.
- **Convergence Verification**: Automatically evaluates functional candidates for $g(x)$ in Fixed-Point Iteration and verifies $|g'(x_0)| < 1$ to guarantee convergence before executing iterations.
- **Symbolic Differentiation**: Computes exact derivatives $f'(x)$ dynamically via SymPy and renders KaTeX mathematical proofs.

### 2. 📐 Systems of Linear Equations Solver
- **Supported Methods**:
  - **Direct Method**: Gauss-Jordan Elimination (with Partial Pivoting and step-by-step Reduced Row Echelon Form / RREF).
  - **Iterative Methods**: Gauss-Jacobi & Gauss-Seidel Elimination.
- **Dynamic Variable Scaling**: Solves systems from $N = 2$ up to $N = 5$ variables ($x, y, z, w, v$).
- **Automated Matrix Conditioning**: Evaluates Strict Diagonal Dominance ($|a_{ii}| > \sum_{j \neq i} |a_{ij}|$) and performs automated row reordering ($R_i \leftrightarrow R_j$) to guarantee iterative convergence.
- **Iteration Tracking**: Displays interactive tables with step counts $k$, variable estimates, and absolute error bounds $\Delta$.

### 3. 📉 Numerical Interpolation Calculator
- **Supported Methods**: Newton's Forward, Newton's Backward, Newton's Divided Differences, and Lagrange Interpolation.
- **Symbolic Polynomial Generation**: Constructs explicit interpolating polynomials $P(x)$ in latex format.
- **Smart Fallback**: Automatically checks data spacing equality and chooses optimal formulas (Forward/Backward for equal spacing, Divided Differences for irregular spacing).
- **Data Import & Plotting**: Supports CSV dataset upload, magic Excel/Sheets copy-paste, and interactive Chart.js polynomial curve rendering.

### 4. 📊 Curve Fitting & Least-Squares Regression
- **Supported Models**: Linear ($y=ax+b$ / $y=a+bx$), Polynomial (degree $m$), Exponential ($y=ae^{bx}$, $y=ab^x$), Logarithmic ($y=a+b\ln x$), and Power ($y=ax^b$).
- **Best Fit Auto-Selection**: Evaluates all models simultaneously and selects the optimal regression curve based on the Coefficient of Determination ($R^2$).
- **Derivation Breakdown**: Renders tabular normal equations $\sum x, \sum y, \sum xy, \sum x^2$ and step-by-step algebraic solving steps.

---

## 🎓 Course Outcome (CO) Mapping

| Course Outcome | Focus Area | Project Implementation |
| :--- | :--- | :--- |
| **CO1** | Root Finding of Non-Linear Equations | Bisection, False Position, Newton-Raphson, and Fixed-Point iteration with automated interval discovery and symbolic derivative proofs. |
| **CO2** | Systems of Linear Equations | Gauss-Jordan with Partial Pivoting, Gauss-Jacobi, and Gauss-Seidel solvers with strict diagonal dominance row reordering. |
| **CO3** | Interpolation & Approximation | Newton's Forward/Backward, Divided Difference, and symbolic Lagrange polynomial interpolation $P(x)$. |
| **CO4** | Curve Fitting & Data Regression | Least-Squares fitting for Linear, Polynomial, Exponential, Logarithmic, and Power models with $R^2$ evaluation. |
| **CO5** | Software Implementation & Analysis | Full-stack Python/Flask architecture with step-by-step KaTeX math rendering, dynamic tables, and Chart.js graphics. |

---

## 🛠️ Tech Stack & Architecture

- **Backend**: Python 3.x, Flask, SymPy (Symbolic Mathematics & Algebraic Derivations).
- **Frontend**: HTML5, Vanilla CSS3 (Dark/Light Design System), JavaScript (ES6+).
- **Typesetting & Graphics**: **KaTeX** (Textbook-quality math rendering), **Chart.js** (Interactive plotting).
- **Deployment**: Vercel Serverless Function configuration (`@vercel/python`).

---

## 🚀 Deployment to Vercel

### Option 1: Via GitHub Integration (Recommended)
1. Push this repository to **GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New Project"**.
3. Import your GitHub repository. Vercel automatically detects `vercel.json` and `requirements.txt`.
4. Click **Deploy**.

### Option 2: Via Vercel CLI
1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```
2. Run the deployment command inside the project directory:
   ```bash
   vercel
   ```

---

## 💻 Running Locally

1. Install required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Start the Flask local development server:
   ```bash
   python app.py
   ```

3. Open your browser at:
   ```text
   http://127.0.0.1:5000
   ```
