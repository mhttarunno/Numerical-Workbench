# Numerical Workbench 🧮

[![Python](https://img.shields.io/badge/Python-3.9%2B-blue.svg)](https://www.python.org/)
[![Framework](https://img.shields.io/badge/Framework-Flask-000000.svg)](https://flask.palletsprojects.com/)
[![Deployment](https://img.shields.io/badge/Deployment-Vercel-black.svg)](https://vercel.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](#-license)
[![Status](https://img.shields.io/badge/Status-Active%20Production-brightgreen.svg)]()

A modern, high-performance web application built for **Numerical Methods** coursework, academic research, and engineering analysis. **Numerical Workbench** delivers textbook-style, step-by-step mathematical derivations, interactive Chart.js visualizations, automated matrix conditioning, and symbolic polynomial synthesis for core numerical algorithms.

Designed & Developed by **Mahfujul Haque Tarunno**.

---

## 📋 Table of Contents

- [🌟 Key Features & Modules](#-key-features--modules)
- [📁 Project Directory Structure](#-project-directory-structure)
- [🔬 Mathematical Methods Overview](#-mathematical-methods-overview)
- [🎨 UI/UX & Design System](#-uiux--design-system)
- [🎓 Course Outcome (CO) Mapping](#-course-outcome-co-mapping)
- [💻 Installation & Local Setup](#-installation--local-setup)
- [🚀 Production Deployment (Vercel)](#-production-deployment-vercel)
- [📊 Usage & Sample Data Formats](#-usage--sample-data-formats)
- [⚡ Performance & Limits](#-performance--limits)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)

---

## 🌟 Key Features & Modules

### 1. 🎯 Root Finding Methods
- **Supported Algorithms**: Bisection Method, False Position (Regula Falsi), Newton-Raphson, and Fixed-Point Iteration.
- **Smart Auto-Bracketing**: Automatically discovers a valid initial interval $[a, b]$ where $f(a) \cdot f(b) < 0$ using systematic step searching if bounds are omitted.
- **Convergence Verification**: Evaluates functional candidates $g(x)$ in Fixed-Point Iteration and verifies $|g'(x_0)| < 1$ to guarantee convergence prior to execution.
- **Symbolic Differentiation**: Computes exact derivatives $f'(x)$ dynamically via SymPy and renders step-by-step KaTeX mathematical proofs.

### 2. 📐 Systems of Linear Equations Solver
- **Supported Methods**:
  - **Direct Method**: Gauss-Jordan Elimination with Partial Pivoting and Reduced Row Echelon Form (RREF).
  - **Iterative Methods**: Gauss-Jacobi & Gauss-Seidel Elimination.
- **Dynamic Variable Scaling**: Solves systems from $N = 2$ up to $N = 5$ variables ($x, y, z, w, v$).
- **Automated Matrix Conditioning**: Evaluates Strict Diagonal Dominance ($|a_{ii}| > \sum_{j \neq i} |a_{ij}|$) and executes automated row swaps ($R_i \leftrightarrow R_j$) to guarantee iterative convergence.
- **Iteration Tracking**: Interactive tables displaying step index $k$, variable estimates, and absolute error thresholds $\epsilon$.

### 3. 📉 Numerical Interpolation Calculator
- **Supported Methods**: Newton's Forward, Newton's Backward, Newton's Divided Differences, and Lagrange Interpolation.
- **Symbolic Polynomial Generation**: Constructs explicit interpolating polynomials $P(x)$ formatted in clean LaTeX.
- **Smart Method Auto-Selection**: Evaluates data interval spacing ($h = x_{i+1} - x_i$) to select optimal formulas (Forward/Backward for uniform spacing, Divided Differences for non-uniform spacing).
- **Data Import & Plotting**: Supports CSV dataset uploads, spreadsheet copy-paste, and interactive Chart.js curve visualization.

### 4. 📊 Curve Fitting & Least-Squares Regression
- **Supported Models**: Linear ($y=ax+b$), Polynomial (degree $m$), Exponential ($y=ae^{bx}$ / $y=ab^x$), Logarithmic ($y=a+b\ln x$), and Power ($y=ax^b$).
- **Best Fit Auto-Selection**: Evaluates all models simultaneously and identifies the optimal regression curve via the Coefficient of Determination ($R^2$).
- **Derivation Breakdown**: Renders tabular normal equations $\sum x, \sum y, \sum xy, \sum x^2$ alongside step-by-step algebraic solutions.

---

## 📁 Project Directory Structure

```text
Numerical Workbench/
├── api/
│   └── index.py            # Vercel serverless entry point wrapping Flask app
├── templates/
│   ├── dashboard.html      # Main modern academic dashboard page
│   ├── index.html          # Interpolation calculator module view
│   ├── roots.html          # Root finding methods solver view
│   ├── curve_fitting.html  # Curve fitting & regression analysis view
│   └── linear_equations.html # Systems of linear equations solver view
├── static/
│   └── style.css           # Centralized CSS design system & responsive layout
├── app.py                  # Core Flask backend & SymPy numerical engine
├── requirements.txt        # Python dependency manifest
├── vercel.json             # Vercel deployment configuration & route rewrites
├── .gitignore              # Git ignore rules
└── README.md               # Documentation & setup guide
```

---

## 🔬 Mathematical Methods Overview

| Category | Method | Key Formula / Governing Principle |
| :--- | :--- | :--- |
| **Root Finding** | Bisection | $c = \frac{a + b}{2}, \quad \text{if } f(a)f(c) < 0 \implies b=c \text{ else } a=c$ |
| | Newton-Raphson | $x_{k+1} = x_k - \frac{f(x_k)}{f'(x_k)}$ |
| | Fixed-Point | $x_{k+1} = g(x_k), \quad \text{Condition: } \|g'(x_0)\| < 1$ |
| **Linear Systems** | Gauss-Jordan | Partial Pivoting + RREF elimination to identity matrix $[I \mid X]$ |
| | Gauss-Seidel | $x_i^{(k+1)} = \frac{1}{a_{ii}} \left( b_i - \sum_{j < i} a_{ij} x_j^{(k+1)} - \sum_{j > i} a_{ij} x_j^{(k)} \right)$ |
| **Interpolation** | Newton Forward | $P(x) = y_0 + p \Delta y_0 + \frac{p(p-1)}{2!} \Delta^2 y_0 + \dots, \quad p = \frac{x-x_0}{h}$ |
| | Lagrange | $L(x) = \sum_{i=0}^n y_i \prod_{j \neq i} \frac{x - x_j}{x_i - x_j}$ |
| **Curve Fitting** | Linear Regression | $\begin{cases} n a + b \sum x = \sum y \\ a \sum x + b \sum x^2 = \sum xy \end{cases}, \quad R^2 = 1 - \frac{SS_{\text{res}}}{SS_{\text{tot}}}$ |

---

## 🎨 UI/UX & Design System

- **Typography**: Display typography powered by **Fraunces** (serif) paired with **Inter** (sans-serif) for body text and **IBM Plex Mono** for matrix inputs.
- **Adaptive Sizing**: Configured with desktop scale factors (`zoom: 1.25x`) and responsive break-points ($\le 900\text{px}$ & $\le 600\text{px}$) for mobile and tablet devices.
- **Color System**: Curated HSL-tailored academic palette supporting seamless **Light / Dark Mode** toggling via CSS custom properties (`var(--paper)`, `var(--ink)`, `var(--rule)`).
- **Typesetting**: Live math expression rendering via **KaTeX**.

---

## 🎓 Course Outcome (CO) Mapping

| Course Outcome | Focus Area | Implementation Detail |
| :--- | :--- | :--- |
| **CO1** | Non-Linear Root Finding | Bisection, Regula Falsi, Newton-Raphson, Fixed-Point iteration with interval discovery & derivative proofs. |
| **CO2** | Systems of Linear Equations | Gauss-Jordan with Partial Pivoting, Gauss-Jacobi, and Gauss-Seidel with diagonal dominance conditioning. |
| **CO3** | Interpolation & Approximation | Newton Forward/Backward, Divided Difference, and explicit Lagrange polynomial $P(x)$ generation. |
| **CO4** | Curve Fitting & Regression | Least-Squares fitting for Linear, Polynomial, Exponential, Logarithmic, and Power models with $R^2$. |
| **CO5** | Software Implementation | Flask/Python full-stack web application with dynamic KaTeX typesetting and interactive Chart.js graphs. |

---

## 💻 Installation & Local Setup

### Prerequisites
- **Python 3.8+** installed on your system
- **pip** package manager

### Step-by-Step Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/numerical-workbench.git
   cd "numerical-workbench"
   ```

2. **Create a Virtual Environment (Optional but Recommended)**:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Application**:
   ```bash
   python app.py
   ```

5. **Access the Application**:
   Navigate to `http://127.0.0.1:5000` in your web browser.

---

## 🚀 Production Deployment (Vercel)

This application is optimized for zero-config serverless deployment on **Vercel**.

### Deploy via Vercel CLI
```bash
npm install -g vercel
vercel
```

### Deploy via GitHub Integration
1. Push your repository to GitHub.
2. Link the repository in the [Vercel Dashboard](https://vercel.com/dashboard).
3. Vercel automatically detects `vercel.json` and builds `api/index.py`.

---

## 📊 Usage & Sample Data Formats

### Interpolation & Curve Fitting CSV Format
```csv
x, y
1.0, 2.1
2.0, 4.5
3.0, 7.8
4.0, 11.2
```

### Linear Equations System Input Example ($N=3$)
```text
 3x +  1y +  1z =  5
 1x +  4y +  1z =  6
 2x +  1y +  5z =  8
```

---

## ⚡ Performance & Numerical Limits

- **Maximum Matrix Dimensions**: $N = 5 \times 5$ (for linear system UI grid)
- **Iteration Cap**: $k_{\max} = 1000$ iterations (prevents infinite loop execution)
- **Convergence Tolerance**: Default $\epsilon = 10^{-4}$ (configurable up to $10^{-8}$)
- **Floating Point Precision**: Double-precision 64-bit IEEE 754 float calculations

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 👨‍💻 Author

**Mahfujul Haque Tarunno**  
Designed & Developed for Numerical Methods Coursework, Engineering Analysis & Academic Presentations.
