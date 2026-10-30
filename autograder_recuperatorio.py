import sys
import json
import hashlib
import argparse
import os
import re

SALT = "LAB1_IA_2026_CatedraArganaraz_SecretSalt"



def strip_prolog_comments(code: str) -> str:
    if not code:
        return ""
    # Eliminar comentarios de bloque /* ... */
    no_block = re.sub(r"/\*.*?\*/", "", code, flags=re.DOTALL)
    # Eliminar comentarios de línea % ...
    no_line = re.sub(r"%[^\n]*", "", no_block)
    return no_line


def split_top_level(text: str, sep: str = ",") -> list:
    """Divide una cadena por el separador `sep` únicamente cuando está en el nivel 0 de paréntesis."""
    parts = []
    current = []
    depth = 0
    for ch in text:
        if ch == "(":
            depth += 1
            current.append(ch)
        elif ch == ")":
            depth = max(0, depth - 1)
            current.append(ch)
        elif ch == sep and depth == 0:
            parts.append("".join(current).strip())
            current = []
        else:
            current.append(ch)
    tail = "".join(current).strip()
    if tail:
        parts.append(tail)
    return parts


def parse_pred_signature(term_str: str):
    """Extrae (nombre_predicado, aridad) de un término como 'atiende(dra_sosa, cardiologia)'."""
    s = re.sub(r"\s+", "", term_str)
    m = re.match(r"^([a-z_][a-zA-Z0-9_]*)\((.*)\)$", s)
    if not m:
        return None, 0
    pred = m.group(1)
    args = split_top_level(m.group(2), ",")
    return pred, len(args)


def canonicalize_fact(clause_body: str) -> str:
    """Normaliza un hecho atómico eliminando espacios y cerrando con punto."""
    compact = re.sub(r"\s+", "", clause_body)
    return compact + "."


def canonicalize_rule(head_str: str, body_str: str) -> str:
    """
    Normaliza una regla de Horn (Cabeza :- Cuerpo) aplicando:
    1. Renombrado alfa-canónico de las variables de la Cabeza (_V0, _V1, ...).
    2. Ordenamiento canónico de las submetas del Cuerpo por predicado/aridad.
    3. Renombrado alfa-canónico de las variables existenciales restantes del Cuerpo.
    """
    head_clean = re.sub(r"\s+", "", head_str)
    raw_goals = [ re.sub(r"\s+", "", g) for g in split_top_level(body_str, ",") if g.strip() ]

    var_pattern = re.compile(r"\b([A-Z_][a-zA-Z0-9_]*)\b")
    var_map = {}
    var_counter = [0]

    def replace_vars(text, create_new=True):
        def _repl(match):
            tok = match.group(1)
            if tok == "_" or re.match(r"^_V\d+$", tok):
                return tok
            if tok not in var_map:
                if not create_new:
                    return tok
                var_map[tok] = f"_V{var_counter[0]}"
                var_counter[0] += 1
            return var_map[tok]
        return var_pattern.sub(_repl, text)

    # Paso 1: Renombrar variables que aparecen en la cabeza
    head_canon = replace_vars(head_clean, create_new=True)

    # Paso 2: Sustituir en las metas del cuerpo las variables ya conocidas de la cabeza
    goals_with_head_vars = [replace_vars(g, create_new=False) for g in raw_goals]

    # Paso 3: Ordenar submetas por (nombre_predicado, aridad, estructura_con_vars_cabeza)
    def goal_sort_key(g):
        pred, arity = parse_pred_signature(g)
        # Reemplazar variables aún no mapeadas por un marcador neutro '~' para ordenar de forma determinista
        neutral = var_pattern.sub(lambda m: m.group(1) if re.match(r"^_V\d+$", m.group(1)) else "~", g)
        return (pred or g, arity, neutral)

    sorted_goals = sorted(goals_with_head_vars, key=goal_sort_key)

    # Paso 4: Renombrar variables existenciales del cuerpo en orden de aparición tras el ordenamiento
    final_goals = [replace_vars(g, create_new=True) for g in sorted_goals]

    return f"{head_canon}:-{','.join(final_goals)}."


def analyze_prolog_kb(code: str) -> dict:
    """
    Analiza una Base de Conocimientos Prolog completa y devuelve:
    - facts_canon: conjunto de hechos canónicos
    - rules_canon: diccionario { 'pred/aridad': set(reglas_canon) } y conjunto total
    - diagnostics: lista de advertencias/errores sintácticos detectados
    """
    diagnostics = []
    facts_canon = set()
    rules_canon = set()
    rules_by_sig = {}
    facts_by_sig = {}

    if not code or not code.strip():
        return {
            "facts_canon": facts_canon,
            "rules_canon": rules_canon,
            "facts_by_sig": facts_by_sig,
            "rules_by_sig": rules_by_sig,
            "diagnostics": ["La Base de Conocimientos está vacía. Escribe o pega los hechos y reglas del caso práctico."]
        }

    # Revisión línea por línea de errores comunes antes de unir cláusulas
    lines = code.splitlines()
    for idx, raw_line in enumerate(lines, start=1):
        line = re.sub(r"%.*$", "", raw_line).strip()
        if not line or line.startswith("/*") or line.endswith("*/") or line.startswith("*"):
            continue
        if line.startswith(":-"):
            if not line.endswith("."):
                diagnostics.append(f"Línea {idx}: La directiva '{line}' debe finalizar con punto (.).")
            continue
        if "=" in line and ":-" not in line and "\\=" not in line:
            diagnostics.append(f"Línea {idx}: Se detectó '=' en lugar del operador de regla ':-'.")
        if line.count("(") == line.count(")") and line.endswith(")") and not line.endswith("."):
            diagnostics.append(f"Línea {idx}: Falta el punto final '.' al cerrar la cláusula '{line}'.")

    clean = strip_prolog_comments(code)
    # Dividir por punto final de cláusula
    raw_clauses = [c.strip() for c in clean.split(".") if c.strip()]

    for clause in raw_clauses:
        if clause.startswith(":-"):
            continue

        if ":-" in clause:
            parts = clause.split(":-", 1)
            head = parts[0].strip()
            body = parts[1].strip()
            pred, arity = parse_pred_signature(head)
            if not pred:
                diagnostics.append(f"Regla con encabezado inválido: '{head}'. Recuerda que el predicado debe iniciar con minúscula.")
                continue

            # Verificar variables singleton en la regla
            all_vars = re.findall(r"\b([A-Z][a-zA-Z0-9_]*)\b", clause)
            for v in set(all_vars):
                if all_vars.count(v) == 1:
                    diagnostics.append(f"Regla {pred}/{arity}: La variable '{v}' aparece una sola vez (variable singleton no unificada).")

            canon = canonicalize_rule(head, body)
            rules_canon.add(canon)
            sig = f"{pred}/{arity}"
            rules_by_sig.setdefault(sig, set()).add(canon)
        else:
            # Es un hecho
            compact = re.sub(r"\s+", "", clause)
            m_upper_pred = re.match(r"^([A-Z][a-zA-Z0-9_]*)\(", compact)
            if m_upper_pred:
                diagnostics.append(f"Hecho '{compact}': El nombre del predicado '{m_upper_pred.group(1)}' inicia con mayúscula (debe ser minúscula).")
                continue

            pred, arity = parse_pred_signature(compact)
            if not pred:
                diagnostics.append(f"Cláusula mal formada o incompleta: '{clause}'.")
                continue

            # Verificar si hay variables con mayúscula dentro de un hecho constante
            inner_args = compact[compact.find("(") + 1 : compact.rfind(")")]
            upper_atoms = re.findall(r"\b([A-Z][a-zA-Z0-9_]*)\b", inner_args)
            if upper_atoms:
                diagnostics.append(
                    f"Hecho {pred}/{arity}: El argumento '{upper_atoms[0]}' inicia con mayúscula (Prolog lo interpreta como Variable libre en vez de átomo constante)."
                )

            canon = canonicalize_fact(compact)
            facts_canon.add(canon)
            sig = f"{pred}/{arity}"
            facts_by_sig.setdefault(sig, set()).add(canon)

    return {
        "facts_canon": facts_canon,
        "rules_canon": rules_canon,
        "facts_by_sig": facts_by_sig,
        "rules_by_sig": rules_by_sig,
        "diagnostics": diagnostics
    }


def setup_encoding():
    if sys.platform == 'win32':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
            sys.stderr.reconfigure(encoding='utf-8')
        except Exception:
            pass


def main():
    setup_encoding()

    parser = argparse.ArgumentParser(description="Autoevaluador Oficial - Examen Recuperatorio Integrador (Laboratorio I - UCSE DASS 2026)")
    parser.add_argument("answers_file", help="Ruta al archivo respuestas_recuperatorio.json generado por el estudiante")
    parser.add_argument("--json", action="store_true", help="Salida estructurada en JSON para CI / Corrección automática")

    args = parser.parse_args()

    if not os.path.exists(args.answers_file):
        print(f"Error: No se encontró el archivo {args.answers_file}")
        sys.exit(1)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    rubric_file = os.path.join(script_dir, "rubric_recuperatorio.json")
    if not os.path.exists(rubric_file):
        print(f"Error: No se encontró la rúbrica oficial {rubric_file}")
        sys.exit(1)

    with open(args.answers_file, 'r', encoding='utf-8') as f:
        try:
            student_data = json.load(f)
        except json.JSONDecodeError:
            print("Error: El archivo de respuestas no es un JSON válido.")
            sys.exit(1)

    with open(rubric_file, 'r', encoding='utf-8') as f:
        rubric = json.load(f)

    total_score = 0.0
    teoria_score = 0.0
    practica_score = 0.0
    practica_kb_score = 0.0
    practica_queries_score = 0.0
    max_score = rubric.get('max_score', 100)
    feedback_msgs = []
    exercise_summaries = []

    student_answers = student_data.get('answers', {})
    student_kbs = student_data.get('prolog_kb', {})

    for ex_id, ex_data in rubric['exercises'].items():
        weight = ex_data.get('weight', 10)
        part = ex_data.get('part', 'teoria' if 'teoria' in ex_id else 'practica')
        ex_hashes = ex_data['hashes']
        total_items = len(ex_hashes)

        if part == 'teoria':
            if ex_id not in student_answers:
                feedback_msgs.append(f"[{ex_id}] ❌ Falta resolver el ejercicio teórico completo.")
                exercise_summaries.append((ex_id, "TEORÍA  ", 0.0, weight, f"0/{total_items} ítems"))
                continue

            ex_student_answers = student_answers[ex_id]
            correct_count = 0
            for item_id, correct_hash in ex_hashes.items():
                if item_id in ex_student_answers:
                    val = ex_student_answers[item_id]
                    h = hashlib.sha256(f"{ex_id}:{item_id}:{val}:{SALT}".encode('utf-8')).hexdigest()
                    if h == correct_hash:
                        correct_count += 1
                    else:
                        feedback_msgs.append(f"[{ex_id} -> {item_id}] ❌ Respuesta teórica incorrecta.")
                else:
                    feedback_msgs.append(f"[{ex_id} -> {item_id}] ❌ Falta responder este ítem.")

            ex_score = round((correct_count / total_items) * weight, 2) if total_items > 0 else 0.0
            total_score += ex_score
            teoria_score += ex_score
            exercise_summaries.append((ex_id, "TEORÍA  ", ex_score, weight, f"{correct_count}/{total_items} ítems"))

            if correct_count < total_items:
                feedback_msgs.append(f"[{ex_id}] 📖 Orientación bibliográfica: {ex_data['feedback']}")

        else:
            # Evaluación híbrida de Caso Práctico: 13 pts Base de Conocimientos (KB) + 12 pts Consultas
            kb_weight = ex_data.get('kb_weight', 13)
            q_weight = ex_data.get('questions_weight', 12)
            expected_fact_hashes = set(ex_data.get('kb_facts_hashes', []))
            expected_rule_hashes = ex_data.get('kb_rules_hashes', {})

            # Obtener código Prolog desde el JSON o como fallback desde el archivo .pl local
            kb_code = student_kbs.get(ex_id, "")
            pl_file = ex_data.get('pl_file', '')
            if (not kb_code or len(kb_code.strip()) < 120) and pl_file:
                pl_path = os.path.join(script_dir, pl_file)
                if os.path.exists(pl_path):
                    try:
                        disk_code = open(pl_path, 'r', encoding='utf-8').read()
                        if len(disk_code.strip()) > len(kb_code.strip()):
                            kb_code = disk_code
                    except Exception:
                        pass

            kb_analysis = analyze_prolog_kb(kb_code)
            student_fact_hashes = {
                hashlib.sha256(f"{ex_id}:fact:{cf}:{SALT}".encode('utf-8')).hexdigest()
                for cf in kb_analysis["facts_canon"]
            }
            matched_facts = len(expected_fact_hashes.intersection(student_fact_hashes))
            total_expected_facts = len(expected_fact_hashes) or 9
            facts_pts = round((matched_facts / total_expected_facts) * 9.0, 2)

            matched_rules = 0
            total_expected_rules = len(expected_rule_hashes) or 2
            for rule_sig, valid_hashes in expected_rule_hashes.items():
                student_rules_for_sig = kb_analysis["rules_by_sig"].get(rule_sig, set())
                student_rule_hashes = {
                    hashlib.sha256(f"{ex_id}:rule:{cr}:{SALT}".encode('utf-8')).hexdigest()
                    for cr in student_rules_for_sig
                }
                if set(valid_hashes).intersection(student_rule_hashes):
                    matched_rules += 1
                else:
                    feedback_msgs.append(f"[{ex_id} -> KB Regla {rule_sig}] ❌ La regla '{rule_sig}' falta o su estructura lógica no coincide con la especificación.")

            if matched_facts < total_expected_facts:
                feedback_msgs.append(
                    f"[{ex_id} -> KB Hechos] ❌ Se validaron {matched_facts}/{total_expected_facts} hechos canónicos del dominio en la Base de Conocimientos."
                )

            for diag in kb_analysis["diagnostics"][:4]:
                feedback_msgs.append(f"[{ex_id} -> Linter Prolog] ⚠️ {diag}")

            rules_pts = round((matched_rules / total_expected_rules) * 4.0, 2)
            kb_score = round(facts_pts + rules_pts, 2)

            # Evaluar las 6 preguntas de consultas (12 pts = 6 x 2 pts)
            ex_student_answers = student_answers.get(ex_id, {})
            correct_q = 0
            for item_id, correct_hash in ex_hashes.items():
                if item_id in ex_student_answers:
                    val = ex_student_answers[item_id]
                    h = hashlib.sha256(f"{ex_id}:{item_id}:{val}:{SALT}".encode('utf-8')).hexdigest()
                    if h == correct_hash:
                        correct_q += 1
                    else:
                        feedback_msgs.append(f"[{ex_id} -> {item_id}] ❌ Respuesta de consulta/CWA incorrecta.")
                else:
                    feedback_msgs.append(f"[{ex_id} -> {item_id}] ❌ Falta responder esta consulta.")

            q_score = round((correct_q / total_items) * q_weight, 2) if total_items > 0 else 0.0
            ex_score = round(kb_score + q_score, 2)

            total_score += ex_score
            practica_score += ex_score
            practica_kb_score += kb_score
            practica_queries_score += q_score

            detail_str = f"KB: {matched_facts}/9 H, {matched_rules}/2 R ({kb_score:.1f}/13p) | Consultas: {correct_q}/6 ({q_score:.1f}/12p)"
            exercise_summaries.append((ex_id, "PRÁCTICA", ex_score, weight, detail_str))

            if ex_score < weight:
                feedback_msgs.append(f"[{ex_id}] 📖 Orientación bibliográfica: {ex_data['feedback']}")

    total_score = round(total_score, 2)
    teoria_score = round(teoria_score, 2)
    practica_score = round(practica_score, 2)

    if args.json:
        out = {
            "tp_id": rubric.get('tp_metadata', {}).get('tp_id', 'LAB1-2026-EXAMEN-RECUPERATORIO'),
            "score": total_score,
            "score_teoria": teoria_score,
            "score_practica": practica_score,
            "score_practica_kb": round(practica_kb_score, 2),
            "score_practica_queries": round(practica_queries_score, 2),
            "max_score": max_score,
            "grade_10": round(total_score / 10.0, 2),
            "passed": total_score >= 60,
            "feedback": feedback_msgs
        }
        print(json.dumps(out, indent=2, ensure_ascii=False))
    else:
        student = student_data.get('student', {})
        nombre = student.get('nombre', 'Estudiante no especificado')
        matricula = student.get('matricula', 'S/D')
        print("\n" + "="*82)
        print("  UNIVERSIDAD CATÓLICA DE SANTIAGO DEL ESTERO (UCSE) — DASS")
        print("  EXAMEN RECUPERATORIO INTEGRADOR — LABORATORIO I (CICLO 2026)")
        print("="*82)
        print(f"  Estudiante : {nombre} (Matrícula/DNI: {matricula})")
        print("-"*82)
        for ex_id, tag, ex_s, w, detail_str in exercise_summaries:
            mark = "✓" if abs(ex_s - w) < 1e-5 else "!"
            print(f"  [{mark}] ({tag}) {ex_id:<22} {ex_s:>5.1f} / {w:>4.1f} pts  [{detail_str}]")
        print("-"*82)

        score_percent = (total_score / max_score) * 100 if max_score > 0 else 0
        bar_len = int(score_percent / 10)
        bar = "■" * bar_len + "·" * (10 - bar_len)

        print(f"  Subtotal Parte I  (Teoría TP1–TP5)                 : {teoria_score:>5.1f} / 50.0 pts")
        print(f"  Subtotal Parte II (Bases de Conocimiento Prolog)   : {practica_kb_score:>5.1f} / 26.0 pts")
        print(f"  Subtotal Parte II (Consultas, SLD y CWA)           : {practica_queries_score:>5.1f} / 24.0 pts")
        print(f"  Subtotal Parte II (Total Práctica Prolog)          : {practica_score:>5.1f} / 50.0 pts")
        print(f"  CALIFICACIÓN FINAL                                 : {total_score:>5.1f} / {max_score} pts  [{bar}] ({score_percent:.1f}%)")
        print(f"  NOTA ESCALA 10                                     : {total_score/10.0:>5.2f} / 10.00")
        print("-"*82)

        if total_score >= 60:
            print("  ESTADO: APROBADO ✅ ¡Excelente dominio teórico y modelado práctico en Prolog!")
        else:
            print("  ESTADO: REQUIERE REVISIÓN ⚠️ Revisa las observaciones del Linter y la bibliografía.")
        print("="*82)

        if feedback_msgs:
            print("\nDetalle de Observaciones, Diagnóstico de KB y Orientación Bibliográfica:")
            for msg in feedback_msgs:
                print(f"  • {msg}")
        else:
            print("\n¡Desempeño perfecto (100/100)! Todas las consignas teóricas, bases de conocimiento y consultas fueron validadas con exactitud.")
        print("\n")


if __name__ == "__main__":
    main()
