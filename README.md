# 🎓 Examen Recuperatorio Integrador: Teoría (TP1–TP5) y Práctica en PROLOG (TP7)
## Cátedra: Laboratorio I (Inteligencia Artificial y Agentes Racionales)
### Universidad Católica de Santiago del Estero (UCSE) — Departamento Académico San Salvador (DASS)
**Carrera:** Tecnicatura Universitaria en Automatización y Robótica / Informática  
**Docente / Jefe de Trabajos Prácticos (JTP):** Ing. Fabio D. Argañaraz  
**Ciclo Lectivo:** 2026 • **Duración:** 90 Minutos • **Puntaje Total:** 100 Puntos  

---

## 📋 Estructura del Examen Recuperatorio (100 Puntos)

### 📘 Parte I: Evaluación Teórico-Conceptual (50 Puntos — 5 Ejercicios × 10 Puntos)
1. **Ejercicio T1 (TP1 — 10 pts):** Agentes Racionales, PEAS y ciclo perceptual.
2. **Ejercicio T2 (TP2 — 10 pts):** Búsqueda a Ciegas (BFS, UCS, DFS, IDDFS).
3. **Ejercicio T3 (TP3 — 10 pts):** Búsqueda Informada ($A^*$, Voraz, heurísticas admisibles).
4. **Ejercicio T4 (TP4 — 10 pts):** Agentes Basados en Conocimiento y Lógica Proposicional.
5. **Ejercicio T5 (TP5 — 10 pts):** Lógica de Primer Orden (LPO) y Fundamentos de Prolog.

### 💻 Parte II: Evaluación Práctica en PROLOG (50 Puntos = 26 pts KB + 24 pts Consultas)
- **Ejercicio Práctico (`caso1_biblioteca.pl` — 50 pts): Sistema Experto de Biblioteca Académica UCSE DASS**
  - **Sección A (26 pts):** Codificación de 9 hechos ($9 \times 2\text{ pts} = 18\text{ pts}$) de `obra/2`, `autor_obra/2` y `disponibilidad/2`, más 2 reglas deductivas ($2 \times 4\text{ pts} = 8\text{ pts}$) de `prestamo_domicilio/1` y `material_ia_disponible/2`.
  - **Sección B (24 pts):** 6 preguntas de verificación de consultas, ligaduras por unificación, backtracking y Supuesto de Mundo Cerrado (CWA) ($6 \times 4\text{ pts} = 24\text{ pts}$).

---

## 🚀 Instrucciones Paso a Paso

1. Abre `index.html` en tu navegador web.
2. Completa tus datos de identificación (Nombre y Apellido, Matrícula/DNI, Correo UCSE y Comisión).
3. El temporizador de **90 minutos** se inicia automáticamente en la barra superior institucional.
4. Resuelve los 5 bloques teóricos (Parte I) y codifica la Base de Conocimientos Prolog + sus 6 consultas (Parte II).
5. Al alcanzar el **100% (27 de 27 completados)**, descarga `respuestas_recuperatorio.json` y el archivo `caso1_biblioteca.pl`.
6. Sube tu entrega al repositorio mediante Git:
   ```bash
   git add respuestas_recuperatorio.json caso1_biblioteca.pl
   git commit -m "Entrega Examen Recuperatorio - [Tu Nombre y Apellido]"
   git push origin main
   ```
