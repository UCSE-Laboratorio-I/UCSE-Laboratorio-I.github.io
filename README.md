# 🎓 Instancia de Recuperatorio Integrador: Teoría (TP1–TP5) y Práctica en PROLOG (TP7)
## Cátedra: Laboratorio I (Inteligencia Artificial y Agentes Racionales)
### Universidad Católica de Santiago del Estero (UCSE) — Departamento Académico San Salvador (DASS)
**Carrera:** Tecnicatura Universitaria en Automatización y Robótica / Informática  
**Docente / Jefe de Trabajos Prácticos (JTP):** Ing. Fabio D. Argañaraz  
**Ciclo Lectivo:** 2026 • **Duración Oficial:** 90 Minutos • **Puntaje Total:** 100 Puntos  

---

## 📋 Estructura del Recuperatorio (100 Puntos)

### 📘 Parte I: Evaluación Teórico-Conceptual (50 Puntos — 5 Ejercicios × 10 Puntos)
1. **Ejercicio T1 (TP1 — 10 pts):** Definición formal de Racionalidad, especificación PEAS de brazo robótico clasificador, limitación de agentes sin estado interno, IA Fuerte vs. Débil e intratabilidad NP vs. heurísticas.
2. **Ejercicio T2 (TP2 — 10 pts):** Profundidad Limitada (DLS e incompletitud si $l < d$), Búsqueda Bidireccional ($O(b^{d/2})$), síntesis comparativa de búsquedas a ciegas y prevención de estados repetidos en grafos (*explored set*).
3. **Ejercicio T3 (TP3 — 10 pts):** Algoritmos heurísticos de memoria acotada ($IDA^*$ por $f$-coste y RBFS con `f_limit`), heurísticas en 8-Puzzle ($h_1$ piezas fuera de lugar vs. $h_2$ Manhattan), dominancia matemática y problemas relajados.
4. **Ejercicio T4 (TP4 — 10 pts):** Encadenamiento hacia adelante (*Data-Driven*) vs. encadenamiento hacia atrás (*Goal-Driven*), aplicaciones en monitoreo/diagnóstico y deducción por modelos en el problema del Unicornio.
5. **Ejercicio T5 (TP5 — 10 pts):** Formalización en LPO del caso del Coronel West, rol de la unificación en inferencia de primer orden y ecuación de Kowalski ($\text{Algoritmo} = \text{Lógica} + \text{Control}$) bajo el Supuesto de Mundo Cerrado (CWA).

### 💻 Parte II: Evaluación Práctica en PROLOG (50 Puntos = 26 pts KB + 24 pts Consultas)
Cada caso práctico (25 pts) se divide en **Sección A (13 pts: 9 hechos $\times 1\text{ pt}$ + 2 reglas $\times 2\text{ pts}$)** codificada en el Editor de Base de Conocimientos con Linter Sintáctico en Tiempo Real y evaluada por normalización $\alpha$-canónica, y **Sección B (12 pts: 6 consultas $\times 2\text{ pts}$)**:
1. **Ejercicio P1 (`caso1_biblioteca.pl` — 25 pts): Sistema Experto de Biblioteca Académica UCSE DASS**
   - Modelado de obras (`aima_russell`, `prolog_bratko`, `calculo_stewart`), áreas temáticas (`inteligencia_artificial`, `matematica`), autores (`russell_norvig`, `ivan_bratko`, `james_stewart`) y disponibilidad (`domicilio`, `solo_sala`).
   - Reglas deductivas: `prestamo_domicilio(Titulo)` y `material_ia_disponible(Titulo, Autor)`.
2. **Ejercicio P2 (`caso2_energia.pl` — 25 pts): Monitoreo de Subestación Eléctrica y Transformadores**
   - Modelado de transformadores (`trafo_t1`, `trafo_t2`, `trafo_t3`), zonas (`parque_industrial`, `hospital_central`, `campus_ucse`), nivel de carga (`sobrecarga`, `nominal`) y aislación térmica (`degradada`, `normal`).
   - Reglas deductivas: `alerta_disparo_termico(Unidad)` y `mantenimiento_prioritario_zona(Unidad, Zona)`.

---

## 🚀 Instrucciones Paso a Paso

1. Abre `index.html` en tu navegador web.
2. Completa tus datos de identificación (Nombre y Apellido, Matrícula/DNI, Correo UCSE y Comisión).
3. Inicia el cronómetro de **90 minutos** en la barra superior institucional.
4. Resuelve los 5 bloques teóricos (Parte I) y codifica las 2 Bases de Conocimiento Prolog + sus 12 consultas usando el Editor con Linter en vivo y el laboratorio SWISH integrado (Parte II).
5. Al alcanzar el **100% (34 de 34 completados)**, descarga `respuestas_recuperatorio.json` (que incluye tus respuestas y tus 2 Bases de Conocimiento en `prolog_kb`) y guárdalo en esta carpeta.
6. Verifica tu calificación con el autoevaluador oficial en Python 3:
   ```bash
   python autograder_recuperatorio.py respuestas_recuperatorio.json
   ```
7. Confirma y sube tu entrega al repositorio mediante Git:
   ```bash
   git add respuestas_recuperatorio.json
   git commit -m "Entrega Examen Recuperatorio - [Tu Nombre y Apellido]"
   git push origin main
   ```

