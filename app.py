"""
Numerical Workbench
-----------------------------------------------------
Flask backend providing a comprehensive suite of numerical methods:
  1. Interpolation: Newton's Forward/Backward, Divided Difference, and Lagrange.
  2. Curve Fitting: Linear, Polynomial, Exponential, Logarithmic, and Power regression.
  3. Root Finding: Various numerical methods for equation solving.
  
Provides full step-by-step mathematical derivations for educational purposes.

Run with:  python app.py
Then open: http://127.0.0.1:5000
"""

from flask import Flask, render_template, request, jsonify
from math import factorial
import sympy as sp
import re

app = Flask(__name__)


# ----------------------------------------------------------------------
# Core numerical methods
# ----------------------------------------------------------------------

def build_difference_table(y_values):
    """
    Builds the full forward-difference table.

    table[i][j] holds the j-th order difference starting at row i.
    table[i][0] = y_i
    table[i][j] = table[i+1][j-1] - table[i][j-1]

    This single table is reused for BOTH forward and backward formulas —
    forward reads the top diagonal, backward reads the bottom (reversed) diagonal.
    """
    n = len(y_values)
    table = [[None] * n for _ in range(n)]
    for i in range(n):
        table[i][0] = y_values[i]

    for j in range(1, n):
        for i in range(n - j):
            table[i][j] = round(table[i + 1][j - 1] - table[i][j - 1], 10)

    return table


def check_equally_spaced(x_values, tol=1e-9):
    diffs = [round(x_values[i + 1] - x_values[i], 9) for i in range(len(x_values) - 1)]
    h = diffs[0]
    for d in diffs:
        if abs(d - h) > tol:
            return False, None
    return True, h


def build_divided_difference_table(x_values, y_values):
    n = len(x_values)
    table = [[None] * n for _ in range(n)]
    for i in range(n):
        table[i][0] = y_values[i]

    for j in range(1, n):
        for i in range(n - j):
            table[i][j] = round((table[i + 1][j - 1] - table[i][j - 1]) / (x_values[i + j] - x_values[i]), 10)

    return table


def newton_divided_difference(x_values, y_values, x_target):
    n = len(x_values)
    table = build_divided_difference_table(x_values, y_values)

    terms = []
    path = []
    running_sum = table[0][0]

    terms.append({
        "order": 0,
        "label": "f[x_0]",
        "diff_value": table[0][0],
        "p_factor_desc": "1",
        "term_value": table[0][0],
        "running_total": running_sum,
    })
    path.append((0, 0))

    for order in range(1, n):
        p_product = 1.0
        factors = []
        for k in range(order):
            p_product *= (x_target - x_values[k])
            factors.append(f"(x - {x_values[k]})")

        coeff = p_product
        diff_value = table[0][order]
        term_value = coeff * diff_value
        running_sum += term_value

        terms.append({
            "order": order,
            "label": f"f[x_0, \\dots, x_{{{order}}}]",
            "diff_value": diff_value,
            "p_factor_desc": "".join(factors),
            "coeff": round(coeff, 10),
            "term_value": round(term_value, 10),
            "running_total": round(running_sum, 10),
        })
        path.append((0, order))

    return {
        "method": "divided_difference",
        "h": "N/A",
        "p": "N/A",
        "p_formula": "\\text{Divided Differences (No } p \\text{ or } h \\text{ required)}",
        "base_point": x_values[0],
        "base_label": "x_0",
        "table": table,
        "path": path,
        "terms": terms,
        "result": round(running_sum, 10),
        "general_formula_latex": r"f(x) = y_0 + (x - x_0)f[x_0, x_1] + (x - x_0)(x - x_1)f[x_0, x_1, x_2] + \dots"
    }

def newton_forward(x_values, y_values, x_target):
    """
    Newton's Forward Interpolation.
    Uses the top diagonal of the difference table: y0, Δy0, Δ²y0, ...
    p = (x - x0) / h
    f(x) = y0 + p*Δy0 + p(p-1)/2! * Δ²y0 + p(p-1)(p-2)/3! * Δ³y0 + ...
    Best when x_target is near the START of the table.
    """
    n = len(x_values)
    ok, h = check_equally_spaced(x_values)
    table = build_difference_table(y_values)

    x0 = x_values[0]
    p = (x_target - x0) / h

    terms = []
    path = []  # (row, col) cells used, for the highlighted diagonal in the UI
    running_sum = table[0][0]
    p_product = 1.0

    terms.append({
        "order": 0,
        "label": "y_0",
        "diff_value": table[0][0],
        "p_factor_desc": "1",
        "term_value": table[0][0],
        "running_total": running_sum,
    })
    path.append((0, 0))

    for order in range(1, n):
        # p(p-1)(p-2)...(p-order+1)
        p_product *= (p - (order - 1))
        coeff = p_product / factorial(order)
        diff_value = table[0][order]
        term_value = coeff * diff_value
        running_sum += term_value

        factors = "".join([f"(p-{k})" if k > 0 else "p" for k in range(order)])

        terms.append({
            "order": order,
            "label": f"\\Delta^{{{order}}} y_0",
            "diff_value": diff_value,
            "p_factor_desc": f"\\frac{{{factors}}}{{{order}!}}",
            "coeff": round(coeff, 10),
            "term_value": round(term_value, 10),
            "running_total": round(running_sum, 10),
        })
        path.append((0, order))

    return {
        "method": "forward",
        "h": h,
        "p": round(p, 10),
        "p_formula": f"\\frac{{x - x_0}}{{h}} = \\frac{{{x_target} - {x0}}}{{{h}}}",
        "base_point": x0,
        "base_label": "x_0",
        "table": table,
        "path": path,
        "terms": terms,
        "result": round(running_sum, 10),
        "general_formula_latex": r"f(x) = y_0 + p \Delta y_0 + \frac{p(p-1)}{2!} \Delta^2 y_0 + \dots + \frac{p(p-1)\dots(p-n+1)}{n!} \Delta^n y_0"
    }


def newton_backward(x_values, y_values, x_target):
    """
    Newton's Backward Interpolation.
    Uses the bottom diagonal of the difference table: yn, \u2207yn, \u2207\u00b2yn, ...
    p = (x - xn) / h   (xn = last x value)
    f(x) = yn + p*\u2207yn + p(p+1)/2! * \u2207\u00b2yn + p(p+1)(p+2)/3! * \u2207\u00b3yn + ...
    Best when x_target is near the END of the table.
    """
    n = len(x_values)
    ok, h = check_equally_spaced(x_values)
    table = build_difference_table(y_values)

    xn = x_values[-1]
    p = (x_target - xn) / h

    terms = []
    path = []
    running_sum = table[n - 1][0]
    p_product = 1.0

    terms.append({
        "order": 0,
        "label": "y_n",
        "diff_value": table[n - 1][0],
        "p_factor_desc": "1",
        "term_value": table[n - 1][0],
        "running_total": running_sum,
    })
    path.append((n - 1, 0))

    for order in range(1, n):
        p_product *= (p + (order - 1))
        coeff = p_product / factorial(order)
        row = n - 1 - order
        diff_value = table[row][order]
        term_value = coeff * diff_value
        running_sum += term_value

        factors = "".join([f"(p+{k})" if k > 0 else "p" for k in range(order)])

        terms.append({
            "order": order,
            "label": f"\\nabla^{{{order}}} y_n",
            "diff_value": diff_value,
            "p_factor_desc": f"\\frac{{{factors}}}{{{order}!}}",
            "coeff": round(coeff, 10),
            "term_value": round(term_value, 10),
            "running_total": round(running_sum, 10),
        })
        path.append((row, order))

    return {
        "method": "backward",
        "h": h,
        "p": round(p, 10),
        "p_formula": f"\\frac{{x - x_n}}{{h}} = \\frac{{{x_target} - {xn}}}{{{h}}}",
        "base_point": xn,
        "base_label": "x_n",
        "table": table,
        "path": path,
        "terms": terms,
        "result": round(running_sum, 10),
        "general_formula_latex": r"f(x) = y_n + p \nabla y_n + \frac{p(p+1)}{2!} \nabla^2 y_n + \dots + \frac{p(p+1)\dots(p+n-1)}{n!} \nabla^n y_n"
    }


def lagrange_interpolation(x_values, y_values, x_target):
    n = len(x_values)
    terms = []
    running_sum = 0.0

    for i in range(n):
        xi = x_values[i]
        yi = y_values[i]

        L_i = 1.0
        numerator_factors = []
        denominator_factors = []

        for j in range(n):
            if i != j:
                xj = x_values[j]
                L_i *= (x_target - xj) / (xi - xj)
                numerator_factors.append(f"(x - {xj})")
                denominator_factors.append(f"({xi} - {xj})")

        term_value = L_i * yi
        running_sum += term_value

        num_str = "".join(numerator_factors)
        den_str = "".join(denominator_factors)

        terms.append({
            "order": i,
            "label": f"y_{i}",
            "diff_value": yi,
            "p_factor_desc": f"\\frac{{{num_str}}}{{{den_str}}}",
            "coeff": round(L_i, 10),
            "term_value": round(term_value, 10),
            "running_total": round(running_sum, 10),
        })

    return {
        "method": "lagrange",
        "h": "N/A",
        "p": "N/A",
        "p_formula": "N/A",
        "base_point": "N/A",
        "base_label": "N/A",
        "table": [],
        "path": [],
        "terms": terms,
        "result": round(running_sum, 10),
        "general_formula_latex": r"f(x) = \sum_{i=0}^{n} y_i \prod_{j \neq i} \frac{x - x_j}{x_i - x_j}"
    }


# ----------------------------------------------------------------------
# Routes
# ----------------------------------------------------------------------

@app.route("/")
def dashboard():
    return render_template("dashboard.html")

@app.route("/interpolation")
def interpolation():
    return render_template("index.html")

@app.route("/roots")
def roots():
    return render_template("roots.html")

@app.route("/curve-fitting")
def curve_fitting():
    return render_template("curve_fitting.html")

@app.route("/linear-equations")
def linear_equations():
    return render_template("linear_equations.html")

@app.route("/api/calculate", methods=["POST"])
def calculate():
    data = request.get_json(force=True)

    try:
        x_values = [float(v) for v in data["x_values"]]
        y_values = [float(v) for v in data["y_values"]]
        method = data.get("method", "auto")

        x_target_str = data.get("x_target", "")
        is_symbolic = False
        if x_target_str == "":
            is_symbolic = True
            x_target = None
        else:
            x_target = float(x_target_str)
    except (KeyError, ValueError, TypeError):
        return jsonify({"error": "Please enter valid numeric values."}), 400

    if len(x_values) != len(y_values):
        return jsonify({"error": "x and y must have the same number of values."}), 400
    if len(x_values) < 2:
        return jsonify({"error": "Enter at least 2 data points."}), 400
    if len(x_values) != len(set(x_values)):
        return jsonify({"error": "x values must be distinct."}), 400

    sorted_pairs = sorted(zip(x_values, y_values), key=lambda p: p[0])
    x_values = [p[0] for p in sorted_pairs]
    y_values = [p[1] for p in sorted_pairs]

    is_equal, h = check_equally_spaced(x_values)
    if not is_equal:
        if method != "lagrange":
            method = "divided_difference"
    else:
        if method == "auto":
            if x_target is None:
                method = "lagrange"
            else:
                dist_to_start = abs(x_target - x_values[0])
                dist_to_end = abs(x_target - x_values[-1])
                method = "forward" if dist_to_start <= dist_to_end else "backward"

    if is_symbolic:
        import sympy as sp
        x = sp.Symbol('x')
        poly = 0
        n = len(x_values)

        terms = []
        running_poly = 0

        for i in range(n):
            term = y_values[i]
            for j in range(n):
                if i != j:
                    term *= (x - x_values[j]) / (x_values[i] - x_values[j])

            poly += term
            running_poly += term

            # format the latex strings for this term
            term_expr = sp.simplify(term)
            term_expr = term_expr.xreplace({num: round(num, 4) for num in term_expr.atoms(sp.Float)})

            running_expr = sp.simplify(running_poly)
            running_expr = running_expr.xreplace({num: round(num, 4) for num in running_expr.atoms(sp.Float)})

            terms.append({
                "order": i,
                "label": f"L_{i}(x) \\cdot y_{i}",
                "latexStr": sp.latex(term_expr),
                "running_total_latex": sp.latex(running_expr)
            })

        simplified = sp.simplify(poly)
        simplified = simplified.xreplace({num: round(num, 4) for num in simplified.atoms(sp.Float)})
        latex_poly = sp.latex(simplified)

        result = {
            "symbolic_mode": True,
            "method": "lagrange",
            "latex_poly": f"P(x) = {latex_poly}",
            "terms": terms
        }
        method = "lagrange" # Force lagrange for curve generation
    else:
        if method == "forward":
            result = newton_forward(x_values, y_values, x_target)
        elif method == "backward":
            result = newton_backward(x_values, y_values, x_target)
        elif method == "lagrange":
            result = lagrange_interpolation(x_values, y_values, x_target)
        else:
            result = newton_divided_difference(x_values, y_values, x_target)

    # Generate curve points for graphing
    curve_points = []
    x_min = x_values[0]
    x_max = x_values[-1]
    padding = (x_max - x_min) * 0.25 if x_max > x_min else 1.0
    start_x = x_min - padding
    end_x = x_max + padding
    num_points = 100
    step = (end_x - start_x) / (num_points - 1)

    for i in range(num_points):
        cx = start_x + i * step
        if method == "forward":
            res = newton_forward(x_values, y_values, cx)
        elif method == "backward":
            res = newton_backward(x_values, y_values, cx)
        elif method == "lagrange":
            res = lagrange_interpolation(x_values, y_values, cx)
        else:
            res = newton_divided_difference(x_values, y_values, cx)
        curve_points.append({"x": cx, "y": res["result"]})

    result["curve"] = curve_points

    result["x_values"] = x_values
    result["y_values"] = y_values
    result["x_target"] = x_target
    result["y_min_data"] = min(y_values)
    result["y_max_data"] = max(y_values)
    return jsonify(result)


# ----------------------------------------------------------------------
# Root Finding Methods
# ----------------------------------------------------------------------

def parse_function(func_str):
    """Safely parse a mathematical function string into a sympy expression."""
    # Pre-process ln_{10} x -> log(x, 10)
    func_str = re.sub(r'ln_?\{?10\}?\s*\(?(x)\)?', r'log(\1, 10)', func_str)

    # Wrap exponents: e^2x -> e^(2x), e^-2x -> e^(-2x), e^x -> e^(x)
    func_str = re.sub(r'\^(-?\d*[a-zA-Z]?)', r'^(\1)', func_str)

    # Insert * between 'x' or a number and the function name (e.g., 'xsin' -> 'x*sin')
    func_str = re.sub(r'(?<=[x0-9])(sin|cos|tan|log|ln|exp|sqrt)', r'*\1', func_str)

    # Auto-add parentheses for shorthand functions like "lnx" -> "ln(x)" or "4*sinx" -> "4*sin(x)"
    func_str = re.sub(r'(?<![a-zA-Z])(sin|cos|tan|log|ln|exp|sqrt)\s*(x)\b', r'\1(\2)', func_str)

    x = sp.Symbol('x')
    try:
        from sympy.parsing.sympy_parser import (
            parse_expr,
            standard_transformations,
            implicit_multiplication_application,
            convert_xor
        )
        transformations = standard_transformations + (implicit_multiplication_application, convert_xor)

        local_dict = {
            'e': sp.E,
            'pi': sp.pi,
            'ln': sp.log,
            'log': sp.log,
            'sin': sp.sin,
            'cos': sp.cos,
            'tan': sp.tan,
            'sqrt': sp.sqrt,
            'exp': sp.exp
        }

        if '=' in func_str:
            lhs_str, rhs_str = func_str.split('=', 1)
            lhs_expr = parse_expr(lhs_str.strip(), local_dict=local_dict, transformations=transformations)
            rhs_expr = parse_expr(rhs_str.strip(), local_dict=local_dict, transformations=transformations)
            expr = lhs_expr - rhs_expr
        else:
            expr = parse_expr(func_str.strip(), local_dict=local_dict, transformations=transformations)

        return expr, x
    except Exception as e:
        raise ValueError(f"Invalid function: {str(e)}")

def bisection_method(func_str, a, b, tol, max_iter):
    expr, x = parse_function(func_str)
    f = sp.lambdify(x, expr, 'math')

    search_log = []
    if a is None or b is None:
        a, b, search_log = auto_bracket(f, expr, x, func_str)
        if a is None:
            return {"error": "Could not automatically find an interval where f(a)*f(b) < 0. Please provide manual bounds."}

    fa = f(a)
    fb = f(b)

    if fa * fb > 0:
        return {"error": f"Function has same signs at endpoints a and b: f({a})={fa:.4f}, f({b})={fb:.4f}. No root guaranteed."}

    iterations = []
    root = None
    for i in range(1, max_iter + 1):
        c = (a + b) / 2
        fc = f(c)
        error = abs(b - a) / 2

        iterations.append({
            "iteration": i,
            "a": a,
            "b": b,
            "f_a": fa,
            "f_b": fb,
            "c": c,
            "f_c": fc,
            "error": error
        })

        if error < tol or abs(fc) < 1e-12:
            root = c
            break

        if fa * fc < 0:
            b = c
            fb = fc
        else:
            a = c
            fa = fc

    if root is None:
        root = (a + b) / 2

    return {"root": root, "iterations": iterations, "method": "Bisection", "search_log": search_log, "f_latex": clean_latex(sp.latex(expr))}

def false_position_method(func_str, a, b, tol, max_iter):
    expr, x = parse_function(func_str)
    f = sp.lambdify(x, expr, 'math')

    search_log = []
    if a is None or b is None:
        a, b, search_log = auto_bracket(f, expr, x, func_str)
        if a is None:
            return {"error": "Could not automatically find an interval where f(a)*f(b) < 0. Please provide manual bounds."}

    fa = f(a)
    fb = f(b)

    if fa * fb > 0:
        return {"error": f"Function has same signs at endpoints a and b: f({a})={fa:.4f}, f({b})={fb:.4f}. No root guaranteed."}

    iterations = []
    root = None
    c_prev = None

    for i in range(1, max_iter + 1):
        c = (a * fb - b * fa) / (fb - fa)
        fc = f(c)

        error = abs(c - c_prev) if c_prev is not None else abs(b - a)

        iterations.append({
            "iteration": i,
            "a": a,
            "b": b,
            "f_a": fa,
            "f_b": fb,
            "c": c,
            "f_c": fc,
            "error": error if c_prev is not None else None
        })

        if (c_prev is not None and error < tol) or abs(fc) < 1e-12:
            root = c
            break

        c_prev = c

        if fa * fc < 0:
            b = c
            fb = fc
        else:
            a = c
            fa = fc

    if root is None:
        root = c

    return {"root": root, "iterations": iterations, "method": "False Position", "search_log": search_log, "f_latex": clean_latex(sp.latex(expr))}

def newton_raphson_method(func_str, x0, tol, max_iter):
    expr, x = parse_function(func_str)
    f_prime_expr = sp.diff(expr, x)

    f = sp.lambdify(x, expr, 'math')
    f_prime = sp.lambdify(x, f_prime_expr, 'math')

    a, b, search_log = auto_bracket(f, expr, x, func_str)
    
    if x0 is None:
        if a is None:
            return {"error": "Could not automatically find an initial guess x0. Please provide it manually."}
        x0 = (a + b) / 2

    iterations = []
    root = None
    curr_x = x0

    for i in range(1, max_iter + 1):
        fx = f(curr_x)
        dfx = f_prime(curr_x)

        if not isinstance(fx, (int, float)) or not isinstance(dfx, (int, float)):
            return {"error": "Equation could not be fully evaluated. Ensure 'x' is the only variable, e.g. use '4*sin(x)' instead of '4sinx'."}

        if abs(dfx) < 1e-12:
            return {"error": f"Derivative is zero at x = {curr_x}. Newton-Raphson fails."}

        next_x = curr_x - (fx / dfx)
        error = abs(next_x - curr_x)

        iterations.append({
            "iteration": i,
            "x": curr_x,
            "f_x": fx,
            "f_prime_x": dfx,
            "x_next": next_x,
            "error": error
        })

        if error < tol:
            root = next_x
            break

        curr_x = next_x

    if root is None:
        root = curr_x

    # Calculate simplified iteration formula for the frontend table header
    x_n = sp.Symbol('x_n')
    try:
        iter_expr = sp.cancel(x - expr / f_prime_expr)
        iter_expr_n = iter_expr.subs(x, x_n)
        iter_formula_latex = sp.latex(iter_expr_n)
    except:
        iter_formula_latex = ""

    return {
        "root": root,
        "iterations": iterations,
        "method": "Newton-Raphson",
        "f_latex": sp.latex(expr),
        "f_prime_latex": sp.latex(f_prime_expr),
        "iter_formula_latex": iter_formula_latex,
        "search_log": search_log,
        "x0_val": x0
    }

def raw_to_latex(func_str, substitute_x=None):
    latex_str = func_str

    # Pre-process ln10 or log10 to display with base
    latex_str = re.sub(r'(ln|log)_?\{?10\}?', r'\\log_{10}', latex_str)

    for func in ['sin', 'cos', 'tan', 'log', 'ln', 'exp']:
        # Don't replace if it's already \log_{10}
        latex_str = re.sub(r'(?<!\\)(?<!\\log_\{10\})\b' + func, r'\\' + func + ' ', latex_str)

    latex_str = latex_str.replace('*', r' \times ')

    if substitute_x is not None:
        val_str = f"({substitute_x})" if substitute_x < 0 else str(substitute_x)
        latex_str = re.sub(r'(\d)x', r'\1 \\times x', latex_str)
        latex_str = latex_str.replace('x', val_str)

    return latex_str

def clean_latex(latex_str):
    """Clean up sympy latex strings for UI."""
    # Convert \frac{\log{\left(...) \right)}}{\log{\left(10 \right)}} to \log_{10}{\left(...) \right)}
    latex_str = re.sub(r'\\frac\{\\log\{\\left\((.*?)\\right\)\}\}\{\\log\{\\left\(10 \\right\)\}\}', r'\\log_{10}{\\left(\1\\right)}', latex_str)
    return latex_str

def auto_bracket(f, expr, x, raw_func_str):
    search_log = []
    exact_root = None
    exact_root_log = None

    def get_eval(val):
        fx = f(val)
        sub_fa_str = raw_to_latex(raw_func_str, substitute_x=val)
        return fx, sub_fa_str

    # Check positive direction
    try:
        fa, sub_fa = get_eval(0)
        search_log.append({"type": "eval", "x": 0, "fx": fa, "sub_latex": sub_fa})
        if fa == 0:
            exact_root = 0.0
            exact_root_log = list(search_log)
    except:
        fa = float('inf')
        sub_fa = ""

    for i in range(1, 101):
        try:
            fb, sub_fb = get_eval(i)
            search_log.append({"type": "eval", "x": i, "fx": fb, "sub_latex": sub_fb})
            
            if fb == 0 and exact_root is None:
                exact_root = float(i)
                exact_root_log = list(search_log)

            if fa != float('inf') and fb != float('inf') and fa != 0 and fb != 0:
                search_log.append({"type": "compare", "a": i-1, "b": i, "fa": fa, "fb": fb})
                if fa * fb < 0:
                    return float(i-1), float(i), search_log
            fa = fb
            sub_fa = sub_fb
        except:
            fa = float('inf')

    # Reset and check negative direction
    search_log_neg = []
    try:
        fa, sub_fa = get_eval(0)
        search_log_neg.append({"type": "eval", "x": 0, "fx": fa, "sub_latex": sub_fa})
    except:
        fa = float('inf')

    for i in range(-1, -101, -1):
        try:
            fb, sub_fb = get_eval(i)
            search_log_neg.append({"type": "eval", "x": i, "fx": fb, "sub_latex": sub_fb})
            
            if fb == 0 and exact_root is None:
                exact_root = float(i)
                exact_root_log = search_log + search_log_neg

            if fa != float('inf') and fb != float('inf') and fa != 0 and fb != 0:
                search_log_neg.append({"type": "compare", "a": i, "b": i+1, "fa": fb, "fb": fa})
                if fa * fb < 0:
                    return float(i), float(i+1), search_log + search_log_neg
            fa = fb
        except:
            fa = float('inf')

    if exact_root is not None:
        return exact_root, exact_root, exact_root_log

    return None, None, search_log

def fixed_point_method(func_str, a, b, tol, max_iter):
    expr, x = parse_function(func_str)
    f_prime_expr = sp.diff(expr, x)

    f = sp.lambdify(x, expr, 'math')
    f_prime = sp.lambdify(x, f_prime_expr, 'math')

    search_log = []
    if a is None or b is None:
        a, b, search_log = auto_bracket(f, expr, x, func_str)
        if a is None:
            return {"error": "No valid interval found in [-100, 100]. Please provide explicit bounds."}

    # Robust generation of g(x) candidates
    x0 = (a + b) / 2.0
    terms = expr.as_ordered_terms()
    
    candidates = []
    
    # Base derivation step setup
    base_steps = []
    if '=' in func_str:
        base_steps.append({"type": "math", "prefix": "", "content": f"{raw_to_latex(func_str)}"})
        base_steps.append({"type": "math", "prefix": "\\Rightarrow", "content": f"{clean_latex(sp.latex(expr))} = 0"})
    else:
        base_steps.append({"type": "math", "prefix": "", "content": f"{raw_to_latex(func_str)} = 0"})
        base_steps.append({"type": "math", "prefix": "\\Rightarrow", "content": f"{raw_to_latex(func_str)} = 0"})

    # Candidate 1: Linear term extraction
    linear_term = None
    coeff = None
    other_terms = []
    for t in terms:
        c, m = t.as_coeff_Mul()
        if m == x and linear_term is None:
            linear_term = t
            coeff = c
        else:
            other_terms.append(t)
            
    if linear_term is not None:
        other_expr = sum(other_terms)
        rhs1 = -other_expr
        abs_coeff = -coeff if coeff < 0 else coeff
        abs_rhs1 = -rhs1 if coeff < 0 else rhs1
        
        g_expr_1 = abs_rhs1 / abs_coeff
        steps_1 = list(base_steps)
        steps_1.append({"type": "math", "prefix": "\\Rightarrow", "content": f"{clean_latex(sp.latex(linear_term))} = {clean_latex(sp.latex(rhs1))}"})
        if coeff < 0:
            steps_1.append({"type": "math", "prefix": "\\Rightarrow", "content": f"{clean_latex(sp.latex(-linear_term))} = {clean_latex(sp.latex(abs_rhs1))}"})
        if abs_coeff != 1:
            g_latex_1 = f"\\frac{{{sp.latex(abs_rhs1)}}}{{{sp.latex(abs_coeff)}}}"
        else:
            g_latex_1 = sp.latex(abs_rhs1)
        steps_1.append({"type": "math", "prefix": "\\therefore", "content": f"x = {g_latex_1}"})
        
        candidates.append((g_expr_1, steps_1, g_latex_1))

    # Candidate 2: Power term extraction (e.g. x^2, x^3)
    power_term = None
    power_coeff = None
    power_exp = None
    power_others = []
    
    for t in terms:
        c, m = t.as_coeff_Mul()
        if m.is_Pow and m.base == x and m.exp.is_integer and power_term is None:
            power_term = t
            power_coeff = c
            power_exp = m.exp
        else:
            power_others.append(t)
            
    if power_term is not None and power_exp > 1:
        other_expr = sum(power_others)
        rhs2 = -other_expr
        abs_coeff2 = -power_coeff if power_coeff < 0 else power_coeff
        abs_rhs2 = -rhs2 if power_coeff < 0 else rhs2
        
        # We need absolute value if exponent is even, but for root finding near x0,
        # we can just use the principal root. To be mathematically safe for sympy:
        # We'll construct (rhs2 / coeff2)**(1/exp)
        g_expr_2 = (abs_rhs2 / abs_coeff2)**(sp.Rational(1, power_exp))
        steps_2 = list(base_steps)
        steps_2.append({"type": "math", "prefix": "\\Rightarrow", "content": f"{clean_latex(sp.latex(power_term))} = {clean_latex(sp.latex(rhs2))}"})
        if power_coeff < 0:
            steps_2.append({"type": "math", "prefix": "\\Rightarrow", "content": f"{clean_latex(sp.latex(-power_term))} = {clean_latex(sp.latex(abs_rhs2))}"})
        if abs_coeff2 != 1:
            steps_2.append({"type": "math", "prefix": "\\Rightarrow", "content": f"x^{{{power_exp}}} = \\frac{{{sp.latex(abs_rhs2)}}}{{{sp.latex(abs_coeff2)}}}"})
        else:
            steps_2.append({"type": "math", "prefix": "\\Rightarrow", "content": f"x^{{{power_exp}}} = {sp.latex(abs_rhs2)}"})
        
        g_latex_2 = sp.latex(g_expr_2)
        steps_2.append({"type": "math", "prefix": "\\therefore", "content": f"x = {g_latex_2}"})
        
        candidates.append((g_expr_2, steps_2, g_latex_2))
        
    # Candidate 3: Fallback (relaxation method)
    x0_frac = sp.Rational(str(x0))
    try:
        dfx0_expr = f_prime_expr.subs(x, x0_frac)
        c_expr = 1 / dfx0_expr if dfx0_expr != 0 else sp.Rational(1, 10)
    except:
        c_expr = sp.Rational(1, 10)

    g_expr_3 = x - c_expr * expr
    g_latex_3 = sp.latex(g_expr_3)
    steps_3 = list(base_steps)
    steps_3.append({"type": "math", "prefix": "\\Rightarrow", "content": f"x - \\left({sp.latex(c_expr)}\\right) \\cdot f(x) = x"})
    steps_3.append({"type": "math", "prefix": "\\therefore", "content": f"x = {g_latex_3}"})
    candidates.append((g_expr_3, steps_3, g_latex_3))

    # Evaluate candidates to find one that converges (|g'(x0)| < 1)
    best_g_expr = None
    best_steps = None
    best_g_latex = None

    for cand_expr, cand_steps, cand_latex in candidates:
        try:
            cand_prime = sp.diff(cand_expr, x)
            cand_prime_func = sp.lambdify(x, cand_prime, 'math')
            val = abs(cand_prime_func(x0))
            if val < 1.0:
                best_g_expr = cand_expr
                best_steps = cand_steps
                best_g_latex = cand_latex
                break
        except:
            continue
            
    # If none satisfy < 1, just use the fallback which usually converges (Newton-like)
    if best_g_expr is None:
        best_g_expr, best_steps, best_g_latex = candidates[-1]

    g_expr = best_g_expr
    derivation_steps = best_steps
    g_latex = best_g_latex

    g = sp.lambdify(x, g_expr, 'math')

    # Calculate derivative of g(x) for textbook output
    g_prime_expr = sp.diff(g_expr, x)
    g_prime = sp.lambdify(x, g_prime_expr, 'math')

    try:
        g_prime_x0_val = abs(g_prime(x0))
    except:
        g_prime_x0_val = 0.0

    iterations = []
    root = None
    curr_x = x0

    for i in range(1, max_iter + 1):
        try:
            next_x = g(curr_x)
        except OverflowError:
            return {"error": "Function evaluated to infinity. Divergence detected."}

        error = abs(next_x - curr_x)

        iterations.append({
            "iteration": i,
            "x": curr_x,
            "g_x": next_x,
            "error": error
        })

        if error < tol:
            root = next_x
            break

        if error > 1e10: # Divergence safety check
            return {"error": f"Method diverges. Error reached {error:.2e}."}

        curr_x = next_x

    return {
        "root": root,
        "iterations": iterations,
        "method": "Fixed Point",
        "f_latex": clean_latex(sp.latex(expr)),
        "g_latex": clean_latex(g_latex) if isinstance(g_latex, str) else g_latex,
        "g_prime_latex": clean_latex(sp.latex(g_prime_expr)),
        "g_prime_x0_val": float(g_prime_x0_val),
        "x0_val": float(x0),
        "x0_latex": sp.latex(sp.Rational(str(x0))),
        "search_log": search_log,
        "derivation_steps": derivation_steps
    }

# ----------------------------------------------------------------------
# Root Finding API Route
# ----------------------------------------------------------------------
@app.route("/api/roots", methods=["POST"])
def roots_calculate():
    data = request.get_json(force=True)
    method = data.get("method")
    func_str = data.get("function")
    tol = float(data.get("tolerance", 1e-6))
    max_iter = int(data.get("max_iterations", 50))

    try:
        if method == "bisection":
            a_val = data.get("a")
            b_val = data.get("b")
            a = float(a_val) if a_val is not None and str(a_val).strip() != "" else None
            b = float(b_val) if b_val is not None and str(b_val).strip() != "" else None
            result = bisection_method(func_str, a, b, tol, max_iter)
        elif method == "false_position":
            a_val = data.get("a")
            b_val = data.get("b")
            a = float(a_val) if a_val is not None and str(a_val).strip() != "" else None
            b = float(b_val) if b_val is not None and str(b_val).strip() != "" else None
            result = false_position_method(func_str, a, b, tol, max_iter)
        elif method == "newton_raphson":
            x0_val = data.get("x0")
            x0 = float(x0_val) if x0_val is not None and str(x0_val).strip() != "" else None
            result = newton_raphson_method(func_str, x0, tol, max_iter)
        elif method == "fixed_point":
            a_val = data.get("a")
            b_val = data.get("b")
            a = float(a_val) if a_val is not None and str(a_val).strip() != "" else None
            b = float(b_val) if b_val is not None and str(b_val).strip() != "" else None
            result = fixed_point_method(func_str, a, b, tol, max_iter)
        else:
            return jsonify({"error": "Unknown method"}), 400

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ----------------------------------------------------------------------
# Curve Fitting API Route
# ----------------------------------------------------------------------
import math

def least_squares_fit(x_vals, y_vals, method="linear", degree=2, linear_form="ax+b", exp_form="ae^bx"):
    n = len(x_vals)
    
    if method == "exponential":
        if any(y <= 0 for y in y_vals):
            return {"error": "Exponential fit requires all y > 0"}
        Y_vals = [math.log(y) for y in y_vals]
        X_vals = x_vals
    elif method == "logarithmic":
        if any(x <= 0 for x in x_vals):
            return {"error": "Logarithmic fit requires all x > 0"}
        Y_vals = y_vals
        X_vals = [math.log(x) for x in x_vals]
    elif method == "power":
        if any(x <= 0 for x in x_vals) or any(y <= 0 for y in y_vals):
            return {"error": "Power fit requires all x > 0 and y > 0"}
        X_vals = [math.log(x) for x in x_vals]
        Y_vals = [math.log(y) for y in y_vals]
    else: 
        X_vals = x_vals
        Y_vals = y_vals

    if method == "polynomial":
        A = sp.Matrix([[x**i for i in range(degree + 1)] for x in X_vals])
        Y = sp.Matrix(Y_vals)
    else:
        A = sp.Matrix([[1, x] for x in X_vals])
        Y = sp.Matrix(Y_vals)

    ATA = A.T * A
    ATY = A.T * Y
    try:
        C = ATA.inv() * ATY
    except sp.NonInvertibleMatrixError:
        return {"error": "Matrix is singular, cannot fit data."}

    coeffs = [float(c) for c in C]
    c0 = coeffs[0] if len(coeffs) > 0 else 0
    c1 = coeffs[1] if len(coeffs) > 1 else 0

    latex_eq = ""
    y_calc = []
    
    if method == "linear":
        if linear_form == "a+bx":
            latex_eq = f"y = {c0:.4g} {('+' if c1 >= 0 else '-')} {abs(c1):.4g}x"
        else:
            latex_eq = f"y = {c1:.4g}x {('+' if c0 >= 0 else '-')} {abs(c0):.4g}"
        y_calc = [c0 + c1*x for x in x_vals]
    elif method == "polynomial":
        terms = []
        for i in range(len(coeffs) - 1, -1, -1):
            c = coeffs[i]
            if i == len(coeffs) - 1:
                if i == 0:
                    terms.append(f"{c:.4g}")
                elif i == 1:
                    terms.append(f"{c:.4g}x")
                else:
                    terms.append(f"{c:.4g}x^{i}")
            else:
                sign = '+' if c >= 0 else '-'
                if i == 0:
                    terms.append(f"{sign} {abs(c):.4g}")
                elif i == 1:
                    terms.append(f"{sign} {abs(c):.4g}x")
                else:
                    terms.append(f"{sign} {abs(c):.4g}x^{i}")
        latex_eq = "y = " + " ".join(terms)
        y_calc = [sum(c * (x**i) for i, c in enumerate(coeffs)) for x in x_vals]
    elif method == "exponential":
        a = math.exp(c0)
        if exp_form == "ab^x":
            b = math.exp(c1)
            latex_eq = f"y = {a:.4g} ({b:.4g})^x"
            y_calc = [a * (b ** x) for x in x_vals]
        else:
            b = c1
            latex_eq = f"y = {a:.4g} e^{{{b:.4g}x}}"
            y_calc = [a * math.exp(b * x) for x in x_vals]
    elif method == "logarithmic":
        latex_eq = f"y = {c0:.4g} {('+' if c1 >= 0 else '-')} {abs(c1):.4g}\\ln(x)"
        y_calc = [c0 + c1 * math.log(x) for x in x_vals]
    elif method == "power":
        a = math.exp(c0)
        b = c1
        latex_eq = f"y = {a:.4g} x^{{{b:.4g}}}"
        y_calc = [a * (x**b) for x in x_vals]

    y_mean = sum(y_vals) / n
    ss_tot = sum((y - y_mean)**2 for y in y_vals)
    ss_res = sum((y_vals[i] - y_calc[i])**2 for i in range(n))
    r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 1.0

    derivation_steps = []
    if method == "linear":
        sum_x = sum(X_vals)
        sum_y = sum(Y_vals)
        sum_x2 = sum(x**2 for x in X_vals)
        sum_xy = sum(X_vals[i]*Y_vals[i] for i in range(n))
        
        if linear_form == "a+bx":
            a = c0
            b = c1
            derivation_steps.append({"type": "text", "content": "<strong>Let the least-squares fitted straight line be:</strong>"})
            derivation_steps.append({"type": "math", "content": "y = a + bx"})
            derivation_steps.append({"type": "text", "content": "<strong>Normal Equations:</strong>"})
            derivation_steps.append({"type": "math", "content": "\\sum y = n a + b \\sum x"})
            derivation_steps.append({"type": "math", "content": "\\sum xy = a \\sum x + b \\sum x^2"})
        else:
            a = c1
            b = c0
            derivation_steps.append({"type": "text", "content": "<strong>Let the least-squares fitted straight line be:</strong>"})
            derivation_steps.append({"type": "math", "content": "y = ax + b"})
            derivation_steps.append({"type": "text", "content": "<strong>Normal Equations:</strong>"})
            derivation_steps.append({"type": "math", "content": "\\sum y = a \\sum x + n b"})
            derivation_steps.append({"type": "math", "content": "\\sum xy = a \\sum x^2 + b \\sum x"})
            
        derivation_steps.append({"type": "text", "content": f"Number of data points, $n = {n}$"})
        derivation_steps.append({"type": "text", "content": "<strong>Calculation for finding the coefficients $a$ and $b$ of the least square line:</strong>"})
        
        table_rows = []
        for i in range(n):
            table_rows.append([
                f"{X_vals[i]:.4g}",
                f"{Y_vals[i]:.4g}",
                f"{(X_vals[i]*Y_vals[i]):.4g}",
                f"{(X_vals[i]**2):.4g}"
            ])
            
        derivation_steps.append({
            "type": "table",
            "headers": ["$x$", "$y$", "$xy$", "$x^2$"],
            "rows": table_rows,
            "footers": [
                f"\\sum x = {sum_x:.4g}",
                f"\\sum y = {sum_y:.4g}",
                f"\\sum xy = {sum_xy:.4g}",
                f"\\sum x^2 = {sum_x2:.4g}"
            ]
        })
        
        derivation_steps.append({"type": "text", "content": "<strong>Substituting the values into the equations, we get:</strong>"})
        
        sign_n = '+' if n >= 0 else '-'
        sign_sum_x = '+' if sum_x >= 0 else '-'
        
        if linear_form == "a+bx":
            derivation_steps.append({"type": "math", "content": f"{n}a {sign_sum_x} {abs(sum_x):.4g}b = {sum_y:.4g}"})
            derivation_steps.append({"type": "math", "content": f"{sum_x:.4g}a {sign_sum_x} {abs(sum_x2):.4g}b = {sum_xy:.4g}"})
        else:
            derivation_steps.append({"type": "math", "content": f"{sum_x:.4g}a {sign_n} {abs(n)}b = {sum_y:.4g}"})
            derivation_steps.append({"type": "math", "content": f"{sum_x2:.4g}a {sign_sum_x} {abs(sum_x):.4g}b = {sum_xy:.4g}"})
            
        derivation_steps.append({"type": "text", "content": "<strong>Solving above equations:</strong>"})
        derivation_steps.append({"type": "math", "content": f"a = {a:.4g}, \\quad b = {b:.4g}"})

    elif method == "exponential":
        sum_X = sum(X_vals)
        sum_Y = sum(Y_vals)
        sum_X2 = sum(x**2 for x in X_vals)
        sum_XY = sum(X_vals[i]*Y_vals[i] for i in range(n))
        
        A = c0
        B = c1
        
        if exp_form == "ab^x":
            derivation_steps.append({"type": "text", "content": "<strong>Let the exponential curve be:</strong>"})
            derivation_steps.append({"type": "math", "content": "y = a b^x"})
            derivation_steps.append({"type": "text", "content": "<strong>Taking natural logarithm on both sides:</strong>"})
            derivation_steps.append({"type": "math", "content": "\\ln(y) = \\ln(a) + x \\ln(b)"})
            derivation_steps.append({"type": "text", "content": "<div style='text-align: center;'>Let $Y = \\ln(y)$, $X = x$, $A = \\ln(a)$, and $B = \\ln(b)$.</div>"})
        else:
            derivation_steps.append({"type": "text", "content": "<strong>Let the exponential curve be:</strong>"})
            derivation_steps.append({"type": "math", "content": "y = a e^{bx}"})
            derivation_steps.append({"type": "text", "content": "<strong>Taking natural logarithm on both sides:</strong>"})
            derivation_steps.append({"type": "math", "content": "\\ln(y) = \\ln(a) + bx"})
            derivation_steps.append({"type": "text", "content": "<div style='text-align: center;'>Let $Y = \\ln(y)$, $X = x$, $A = \\ln(a)$, and $B = b$.</div>"})

        derivation_steps.append({"type": "math", "content": "Y = A + BX"})
        derivation_steps.append({"type": "text", "content": "<strong>This is a linear equation. The normal equations are:</strong>"})
        derivation_steps.append({"type": "math", "content": "\\sum Y = n A + B \\sum X"})
        derivation_steps.append({"type": "math", "content": "\\sum XY = A \\sum X + B \\sum X^2"})
        
        derivation_steps.append({"type": "text", "content": f"Number of data points, $n = {n}$"})
        
        table_rows = []
        for i in range(n):
            table_rows.append([
                f"{x_vals[i]:.4g}",
                f"{y_vals[i]:.4g}",
                f"{X_vals[i]:.4g}",
                f"{Y_vals[i]:.4g}",
                f"{(X_vals[i]*Y_vals[i]):.4g}",
                f"{(X_vals[i]**2):.4g}"
            ])
            
        derivation_steps.append({
            "type": "table",
            "headers": ["$x$", "$y$", "$X$", "$Y = \\ln(y)$", "$XY$", "$X^2$"],
            "rows": table_rows,
            "footers": [
                "",
                "",
                f"\\sum X = {sum_X:.4g}",
                f"\\sum Y = {sum_Y:.4g}",
                f"\\sum XY = {sum_XY:.4g}",
                f"\\sum X^2 = {sum_X2:.4g}"
            ]
        })
        
        derivation_steps.append({"type": "text", "content": "<strong>Substituting the values into the equations, we get:</strong>"})
        sign_n = '+' if n >= 0 else '-'
        sign_sum_X = '+' if sum_X >= 0 else '-'
        
        derivation_steps.append({"type": "math", "content": f"{n}A {sign_sum_X} {abs(sum_X):.4g}B = {sum_Y:.4g}"})
        derivation_steps.append({"type": "math", "content": f"{sum_X:.4g}A {sign_sum_X} {abs(sum_X2):.4g}B = {sum_XY:.4g}"})
            
        derivation_steps.append({"type": "text", "content": "<strong>Solving above equations:</strong>"})
        derivation_steps.append({"type": "math", "content": f"A = {A:.4g}, \\quad B = {B:.4g}"})
        
        derivation_steps.append({"type": "text", "content": "<strong>Transforming back:</strong>"})
        if exp_form == "ab^x":
            derivation_steps.append({"type": "math", "content": f"a = e^A = {math.exp(A):.4g}, \\quad b = e^B = {math.exp(B):.4g}"})
        else:
            derivation_steps.append({"type": "math", "content": f"a = e^A = {math.exp(A):.4g}, \\quad b = B = {B:.4g}"})

    elif method == "polynomial":
        m = degree
        
        sum_x_pow = [sum(x**k for x in X_vals) for k in range(2 * m + 1)]
        sum_x_y_pow = [sum((x**k)*y for x, y in zip(X_vals, Y_vals)) for k in range(m + 1)]
        
        derivation_steps.append({"type": "text", "content": f"<strong>Let the polynomial curve of degree {m} be:</strong>"})
        
        full_alphabet = "abcdefghijklmnopqrstuvwxyz"
        alphabet = full_alphabet[:m+1][::-1]
        
        eq_terms = []
        for k in range(m, -1, -1):
            if k == 0:
                eq_terms.append(f"{alphabet[0]}")
            elif k == 1:
                eq_terms.append(f"{alphabet[1]} x")
            else:
                eq_terms.append(f"{alphabet[k]} x^{k}")
        derivation_steps.append({"type": "math", "content": "y = " + " + ".join(eq_terms)})
        
        derivation_steps.append({"type": "text", "content": "<strong>Normal Equations:</strong>"})
        
        for eq_idx in range(m + 1):
            lhs = "\\sum y" if eq_idx == 0 else (f"\\sum x y" if eq_idx == 1 else f"\\sum x^{eq_idx} y")
            rhs_terms = []
            for term_idx in range(m, -1, -1):
                pow_val = eq_idx + term_idx
                if pow_val == 0:
                    rhs_terms.append(f"n {alphabet[0]}")
                elif pow_val == 1:
                    rhs_terms.append(f"{alphabet[term_idx]} \\sum x")
                else:
                    rhs_terms.append(f"{alphabet[term_idx]} \\sum x^{pow_val}")
            derivation_steps.append({"type": "math", "content": lhs + " = " + " + ".join(rhs_terms)})
            
        derivation_steps.append({"type": "text", "content": f"Number of data points, $n = {n}$"})
        derivation_steps.append({"type": "text", "content": f"<strong>Calculation for finding the coefficients $a \\dots {alphabet[m]}$ of the polynomial curve:</strong>"})
        
        headers = ["$x$", "$y$"]
        for k in range(2, 2*m + 1):
            headers.append(f"$x^{{{k}}}$")
        headers.append("$xy$")
        for k in range(2, m + 1):
            headers.append(f"$x^{{{k}}}y$")
            
        table_rows = []
        for i in range(n):
            row = [f"{X_vals[i]:.4g}", f"{Y_vals[i]:.4g}"]
            for k in range(2, 2*m + 1):
                row.append(f"{(X_vals[i]**k):.4g}")
            row.append(f"{(X_vals[i]*Y_vals[i]):.4g}")
            for k in range(2, m + 1):
                row.append(f"{(X_vals[i]**k * Y_vals[i]):.4g}")
            table_rows.append(row)
            
        footers = [f"\\sum x = {sum_x_pow[1]:.4g}", f"\\sum y = {sum_x_y_pow[0]:.4g}"]
        for k in range(2, 2*m + 1):
            footers.append(f"\\sum x^{{{k}}} = {sum_x_pow[k]:.4g}")
        footers.append(f"\\sum xy = {sum_x_y_pow[1]:.4g}")
        for k in range(2, m + 1):
            footers.append(f"\\sum x^{{{k}}}y = {sum_x_y_pow[k]:.4g}")
            
        derivation_steps.append({
            "type": "table",
            "headers": headers,
            "rows": table_rows,
            "footers": footers
        })
        
        derivation_steps.append({"type": "text", "content": "<strong>Substituting the values into the equations, we get:</strong>"})
        for eq_idx in range(m + 1):
            rhs = f"{sum_x_y_pow[eq_idx]:.4g}"
            lhs_terms = []
            for term_idx in range(m, -1, -1):
                pow_val = eq_idx + term_idx
                coeff_val = n if pow_val == 0 else sum_x_pow[pow_val]
                if len(lhs_terms) == 0:
                    lhs_terms.append(f"{coeff_val:.4g}{alphabet[term_idx]}")
                else:
                    sign = "+" if coeff_val >= 0 else "-"
                    lhs_terms.append(f"{sign} {abs(coeff_val):.4g}{alphabet[term_idx]}")
            derivation_steps.append({"type": "math", "content": " ".join(lhs_terms) + f" = {rhs}"})
            
        derivation_steps.append({"type": "text", "content": "<strong>Solving above equations:</strong>"})
        ans_terms = []
        for idx in range(m, -1, -1):
            c = coeffs[idx]
            ans_terms.append(f"{alphabet[idx]} = {c:.4g}")
        ans_groups = [", \\quad ".join(ans_terms[i:i+3]) for i in range(0, len(ans_terms), 3)]
        for group in ans_groups:
            derivation_steps.append({"type": "math", "content": group})

    elif method == "logarithmic":
        sum_X = sum(X_vals)
        sum_Y = sum(Y_vals)
        sum_X2 = sum(x**2 for x in X_vals)
        sum_XY = sum(X_vals[i]*Y_vals[i] for i in range(n))
        
        A = c0
        B = c1
        
        derivation_steps.append({"type": "text", "content": "<strong>Let the logarithmic curve be:</strong>"})
        derivation_steps.append({"type": "math", "content": "y = a + b \\ln(x)"})
        derivation_steps.append({"type": "text", "content": "<div style='text-align: center;'>Let $Y = y$, $X = \\ln(x)$, $A = a$, and $B = b$.</div>"})
        
        derivation_steps.append({"type": "math", "content": "Y = A + BX"})
        derivation_steps.append({"type": "text", "content": "<strong>This is a linear equation. The normal equations are:</strong>"})
        derivation_steps.append({"type": "math", "content": "\\sum Y = n A + B \\sum X"})
        derivation_steps.append({"type": "math", "content": "\\sum XY = A \\sum X + B \\sum X^2"})
        
        derivation_steps.append({"type": "text", "content": f"Number of data points, $n = {n}$"})
        
        table_rows = []
        for i in range(n):
            table_rows.append([
                f"{x_vals[i]:.4g}",
                f"{y_vals[i]:.4g}",
                f"{X_vals[i]:.4g}",
                f"{(X_vals[i]*Y_vals[i]):.4g}",
                f"{(X_vals[i]**2):.4g}"
            ])
            
        derivation_steps.append({
            "type": "table",
            "headers": ["$x$", "$y = Y$", "$X = \\ln(x)$", "$XY$", "$X^2$"],
            "rows": table_rows,
            "footers": [
                "",
                f"\\sum Y = {sum_Y:.4g}",
                f"\\sum X = {sum_X:.4g}",
                f"\\sum XY = {sum_XY:.4g}",
                f"\\sum X^2 = {sum_X2:.4g}"
            ]
        })
        
        derivation_steps.append({"type": "text", "content": "<strong>Substituting the values into the equations, we get:</strong>"})
        sign_n = '+' if n >= 0 else '-'
        sign_sum_X = '+' if sum_X >= 0 else '-'
        
        derivation_steps.append({"type": "math", "content": f"{n}A {sign_sum_X} {abs(sum_X):.4g}B = {sum_Y:.4g}"})
        derivation_steps.append({"type": "math", "content": f"{sum_X:.4g}A {sign_sum_X} {abs(sum_X2):.4g}B = {sum_XY:.4g}"})
            
        derivation_steps.append({"type": "text", "content": "<strong>Solving above equations:</strong>"})
        derivation_steps.append({"type": "math", "content": f"A = {A:.4g}, \\quad B = {B:.4g}"})
        
        derivation_steps.append({"type": "text", "content": "<strong>Transforming back:</strong>"})
        derivation_steps.append({"type": "math", "content": f"a = A = {A:.4g}, \\quad b = B = {B:.4g}"})

    elif method == "power":
        sum_X = sum(X_vals)
        sum_Y = sum(Y_vals)
        sum_X2 = sum(x**2 for x in X_vals)
        sum_XY = sum(X_vals[i]*Y_vals[i] for i in range(n))
        
        A = c0
        B = c1
        
        derivation_steps.append({"type": "text", "content": "<strong>Let the power curve be:</strong>"})
        derivation_steps.append({"type": "math", "content": "y = a x^b"})
        derivation_steps.append({"type": "text", "content": "<strong>Taking natural logarithm on both sides:</strong>"})
        derivation_steps.append({"type": "math", "content": "\\ln(y) = \\ln(a) + b \\ln(x)"})
        derivation_steps.append({"type": "text", "content": "<div style='text-align: center;'>Let $Y = \\ln(y)$, $X = \\ln(x)$, $A = \\ln(a)$, and $B = b$.</div>"})

        derivation_steps.append({"type": "math", "content": "Y = A + BX"})
        derivation_steps.append({"type": "text", "content": "<strong>This is a linear equation. The normal equations are:</strong>"})
        derivation_steps.append({"type": "math", "content": "\\sum Y = n A + B \\sum X"})
        derivation_steps.append({"type": "math", "content": "\\sum XY = A \\sum X + B \\sum X^2"})
        
        derivation_steps.append({"type": "text", "content": f"Number of data points, $n = {n}$"})
        
        table_rows = []
        for i in range(n):
            table_rows.append([
                f"{x_vals[i]:.4g}",
                f"{y_vals[i]:.4g}",
                f"{X_vals[i]:.4g}",
                f"{Y_vals[i]:.4g}",
                f"{(X_vals[i]*Y_vals[i]):.4g}",
                f"{(X_vals[i]**2):.4g}"
            ])
            
        derivation_steps.append({
            "type": "table",
            "headers": ["$x$", "$y$", "$X = \\ln(x)$", "$Y = \\ln(y)$", "$XY$", "$X^2$"],
            "rows": table_rows,
            "footers": [
                "",
                "",
                f"\\sum X = {sum_X:.4g}",
                f"\\sum Y = {sum_Y:.4g}",
                f"\\sum XY = {sum_XY:.4g}",
                f"\\sum X^2 = {sum_X2:.4g}"
            ]
        })
        
        derivation_steps.append({"type": "text", "content": "<strong>Substituting the values into the equations, we get:</strong>"})
        sign_n = '+' if n >= 0 else '-'
        sign_sum_X = '+' if sum_X >= 0 else '-'
        
        derivation_steps.append({"type": "math", "content": f"{n}A {sign_sum_X} {abs(sum_X):.4g}B = {sum_Y:.4g}"})
        derivation_steps.append({"type": "math", "content": f"{sum_X:.4g}A {sign_sum_X} {abs(sum_X2):.4g}B = {sum_XY:.4g}"})
            
        derivation_steps.append({"type": "text", "content": "<strong>Solving above equations:</strong>"})
        derivation_steps.append({"type": "math", "content": f"A = {A:.4g}, \\quad B = {B:.4g}"})
        
        derivation_steps.append({"type": "text", "content": "<strong>Transforming back:</strong>"})
        derivation_steps.append({"type": "math", "content": f"a = e^A = {math.exp(A):.4g}, \\quad b = B = {B:.4g}"})

    return {
        "method": method,
        "equation": latex_eq,
        "r_squared": r_squared,
        "y_calc": y_calc,
        "c0": c0,
        "c1": c1,
        "coeffs": coeffs,
        "derivation_steps": derivation_steps
    }

@app.route("/api/curve-fitting", methods=["POST"])
def curve_fitting_api():
    data = request.get_json(force=True)
    try:
        x_values = [float(v) for v in data["x_values"]]
        y_values = [float(v) for v in data["y_values"]]
        method = data.get("method", "linear")
        linear_form = data.get("linear_form", "ax+b")
        exp_form = data.get("exp_form", "ae^bx")
        try:
            degree = int(data.get("degree", 2))
        except ValueError:
            degree = 2
        
        x_target_str = data.get("x_target", "")
        x_target = float(x_target_str) if x_target_str.strip() != "" else None
    except (KeyError, ValueError, TypeError):
        return jsonify({"error": "Please enter valid numeric values."}), 400

    if len(x_values) != len(y_values):
        return jsonify({"error": "x and y must have the same number of values."}), 400
    if len(x_values) < 2:
        return jsonify({"error": "Enter at least 2 data points."}), 400
    if method == "polynomial" and len(x_values) <= degree:
        return jsonify({"error": f"Polynomial fit of degree {degree} requires at least {degree + 1} data points."}), 400

    if method == "best_fit":
        methods = ["linear", "polynomial", "exponential", "logarithmic", "power"]
        best_r2 = -float('inf')
        best_result = None
        for m in methods:
            # use degree=2 for best_fit polynomial
            res = least_squares_fit(x_values, y_values, m, degree=(degree if m == "polynomial" else 2), linear_form=linear_form, exp_form=exp_form)
            if "error" not in res and res["r_squared"] > best_r2:
                best_r2 = res["r_squared"]
                best_result = res
        if best_result is None:
            return jsonify({"error": "Could not find a valid fit."}), 400
        result = best_result
        result["best_fit_selected"] = result["method"]
    else:
        result = least_squares_fit(x_values, y_values, method, degree, linear_form=linear_form, exp_form=exp_form)
        if "error" in result:
            return jsonify({"error": result["error"]}), 400

    # Generate smooth curve for plotting
    x_min, x_max = min(x_values), max(x_values)
    padding = (x_max - x_min) * 0.1 if x_max > x_min else 1.0
    start_x = max(0.001, x_min - padding) if result["method"] in ["logarithmic", "power"] else x_min - padding
    end_x = x_max + padding
    num_points = 100
    step = (end_x - start_x) / (num_points - 1)
    
    curve_points = []
    m = result["method"]
    c0 = result["c0"]
    c1 = result["c1"]
    coeffs = result.get("coeffs", [c0, c1])
    
    for i in range(num_points):
        cx = start_x + i * step
        cy = 0
        try:
            if m == "linear":
                cy = c0 + c1 * cx
            elif m == "polynomial":
                cy = sum(c * (cx**j) for j, c in enumerate(coeffs))
            elif m == "exponential":
                if exp_form == "ab^x":
                    cy = math.exp(c0) * (math.exp(c1)**cx)
                else:
                    cy = math.exp(c0) * math.exp(c1 * cx)
            elif m == "logarithmic":
                cy = c0 + c1 * math.log(cx)
            elif m == "power":
                cy = math.exp(c0) * (cx**c1)
            curve_points.append({"x": cx, "y": cy})
        except:
            pass

    if x_target is not None:
        try:
            cy = 0
            sub_eq = ""
            if m == "linear":
                cy = c0 + c1 * x_target
                if linear_form == "a+bx":
                    sub_eq = f"{c0:.4g} {('+' if c1 >= 0 else '-')} {abs(c1):.4g}({x_target})"
                else:
                    sub_eq = f"{c1:.4g}({x_target}) {('+' if c0 >= 0 else '-')} {abs(c0):.4g}"
            elif m == "polynomial":
                cy = sum(c * (x_target**j) for j, c in enumerate(coeffs))
                terms = []
                for j in range(len(coeffs) - 1, -1, -1):
                    c = coeffs[j]
                    if j == len(coeffs) - 1:
                        if j == 0:
                            terms.append(f"{c:.4g}")
                        elif j == 1:
                            terms.append(f"{c:.4g}({x_target})")
                        else:
                            terms.append(f"{c:.4g}({x_target})^{j}")
                    else:
                        sign = '+' if c >= 0 else '-'
                        if j == 0:
                            terms.append(f"{sign} {abs(c):.4g}")
                        elif j == 1:
                            terms.append(f"{sign} {abs(c):.4g}({x_target})")
                        else:
                            terms.append(f"{sign} {abs(c):.4g}({x_target})^{j}")
                sub_eq = " ".join(terms)
            elif m == "exponential":
                if exp_form == "ab^x":
                    cy = math.exp(c0) * (math.exp(c1)**x_target)
                    sub_eq = f"{math.exp(c0):.4g} ({math.exp(c1):.4g})^{{{x_target}}}"
                else:
                    cy = math.exp(c0) * math.exp(c1 * x_target)
                    sub_eq = f"{math.exp(c0):.4g} e^{{{c1:.4g}({x_target})}}"
            elif m == "logarithmic":
                cy = c0 + c1 * math.log(x_target)
                sub_eq = f"{c0:.4g} {('+' if c1 >= 0 else '-')} {abs(c1):.4g}\\ln({x_target})"
            elif m == "power":
                cy = math.exp(c0) * (x_target**c1)
                sub_eq = f"{math.exp(c0):.4g} ({x_target})^{{{c1:.4g}}}"
            
            result["estimated_y"] = cy
            result["x_target"] = x_target
            result["equation_substituted"] = sub_eq
        except:
            pass

    result["curve"] = curve_points
    result["x_values"] = x_values
    result["y_values"] = y_values
    return jsonify(result)

if __name__ == "__main__":
    app.run(debug=True)
