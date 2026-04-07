import type { GeneratedExam } from './types';

export function escapeHTML(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderMarkdownTableToHTML(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines
        .filter((l) => !/^\s*\|[\s\-:|]+\|\s*$/.test(l))
        .map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
      if (rows.length > 0) {
        const [header, ...body] = rows;
        result.push('<table class="md-table">');
        result.push(`<thead><tr>${header.map((c) => `<th>${escapeHTML(c)}</th>`).join('')}</tr></thead>`);
        result.push(`<tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${escapeHTML(c)}</td>`).join('')}</tr>`).join('')}</tbody>`);
        result.push('</table>');
      }
    } else {
      result.push(lines[i]);
      i++;
    }
  }
  return result.join('\n');
}

export function generateExamHTML(exam: GeneratedExam, includeSolutions: boolean): string {
  const taskRows = exam.tasks
    .map((task) => {
      const sol = includeSolutions ? exam.solution.find((s) => s.taskId === task.id) : null;

      const subTasksHTML =
        task.subTasks && task.subTasks.length > 0
          ? `<div class="subtasks">${task.subTasks
              .map((st) => `<div class="subtask"><span class="sub-label">${escapeHTML(st.label)})</span> ${escapeHTML(st.text)} <span class="pts">(${st.points} Pkt.)</span></div>`)
              .join('')}</div>`
          : '';

      const optionsHTML =
        task.options && Object.keys(task.options).length > 0
          ? `<div class="mc-options">${Object.entries(task.options)
              .map(([k, v]) => `<div class="mc-option"><span class="mc-key">${escapeHTML(k)}</span>${escapeHTML(v)}</div>`)
              .join('')}</div>`
          : '';

      const descHTML = renderMarkdownTableToHTML(escapeHTML(task.description));

      const solHTML = sol
        ? `<div class="solution">
            <div class="sol-header">✓ Musterlösung${sol.correctOption ? ` — Richtige Antwort: ${escapeHTML(sol.correctOption)}` : ''}</div>
            <pre>${escapeHTML(sol.solution)}</pre>
            ${sol.keyPoints.length ? `<ul class="keypoints">${sol.keyPoints.map((k) => `<li>${escapeHTML(k)}</li>`).join('')}</ul>` : ''}
            ${sol.commonMistakes.length ? `<div class="mistakes-header">Häufige Fehler:</div><ul class="mistakes">${sol.commonMistakes.map((m) => `<li>${escapeHTML(m)}</li>`).join('')}</ul>` : ''}
           </div>`
        : '';

      const diagramHTML =
        task.hasDiagram && task.diagramDescription
          ? `<div class="diagram">📊 Diagramm-Aufgabe<br><pre>${escapeHTML(task.diagramDescription)}</pre></div>`
          : '';

      return `<div class="task">
  <div class="task-header">
    <div class="task-num">#${task.number}</div>
    <div class="task-meta">
      <div class="task-title">${escapeHTML(task.title)}</div>
      <div class="badges"><span class="badge">${escapeHTML(task.type)}</span><span class="badge pts">${task.points} Punkte</span></div>
    </div>
  </div>
  ${diagramHTML}
  <div class="description">${descHTML}</div>
  ${optionsHTML}
  ${subTasksHTML}
  ${solHTML}
</div>`;
    })
    .join('\n');

  const css = `
    body { font-family: Arial, sans-serif; max-width: 820px; margin: 0 auto; padding: 24px; color: #111; line-height: 1.5; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    .meta { color: #666; font-size: 13px; margin-bottom: 28px; }
    .task { border: 1px solid #ddd; border-radius: 8px; padding: 18px; margin-bottom: 18px; page-break-inside: avoid; }
    .task-header { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 10px; }
    .task-num { font-size: 30px; font-weight: bold; color: #bbb; line-height: 1; min-width: 48px; }
    .task-title { font-weight: bold; font-size: 15px; margin-bottom: 4px; }
    .badges { display: flex; gap: 6px; flex-wrap: wrap; }
    .badge { background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; padding: 2px 7px; font-size: 11px; }
    .badge.pts { background: #dbeafe; color: #1d4ed8; border-color: #bfdbfe; }
    .description { font-family: 'Courier New', monospace; font-size: 13px; background: #fafafa; border: 1px solid #eee; border-radius: 4px; padding: 12px; white-space: pre-wrap; margin: 8px 0; }
    .subtasks { margin: 8px 0 8px 16px; }
    .subtask { padding: 3px 0; font-size: 13px; }
    .sub-label { font-weight: bold; color: #1d4ed8; }
    .pts { color: #888; font-size: 11px; margin-left: 4px; }
    .diagram { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 10px; margin: 8px 0; font-size: 12px; }
    .diagram pre { margin: 6px 0 0; font-size: 11px; white-space: pre-wrap; }
    .solution { margin-top: 14px; padding: 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; }
    .sol-header { font-weight: bold; font-size: 12px; color: #166534; margin-bottom: 8px; }
    .solution pre { font-size: 12px; white-space: pre-wrap; margin: 0 0 8px; font-family: 'Courier New', monospace; }
    .keypoints li { color: #166534; font-size: 12px; margin: 2px 0; }
    .mistakes-header { font-size: 11px; color: #991b1b; font-weight: bold; margin: 6px 0 2px; }
    .mistakes li { color: #991b1b; font-size: 12px; margin: 2px 0; }
    .md-table { border-collapse: collapse; font-size: 12px; margin: 8px 0; width: 100%; }
    .md-table th { border: 1px solid #ccc; padding: 6px 10px; background: #f5f5f5; font-weight: bold; }
    .md-table td { border: 1px solid #ddd; padding: 5px 10px; }
    .mc-options { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 8px 0 12px; }
    .mc-option { display: flex; gap: 8px; align-items: flex-start; border: 1px solid #ddd; border-radius: 6px; padding: 6px 10px; font-size: 13px; background: #fafafa; }
    .mc-key { font-weight: bold; color: #1d4ed8; min-width: 18px; }
    @media print { body { padding: 0; } .task { border-color: #ccc; } }
  `;

  const solNote = includeSolutions ? ' (mit Musterlösung)' : '';
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHTML(exam.title)}${solNote}</title>
<style>${css}</style>
</head>
<body>
<h1>${escapeHTML(exam.title)}${solNote}</h1>
<div class="meta">⏱ ${exam.duration} Min &nbsp;·&nbsp; 📊 ${exam.totalPoints} Punkte &nbsp;·&nbsp; 📝 ${exam.tasks.length} Aufgaben</div>
${taskRows}
</body>
</html>`;
}

export function downloadHTML(exam: GeneratedExam, includeSolutions: boolean) {
  const html = generateExamHTML(exam, includeSolutions);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const suffix = includeSolutions ? '_mit_loesung' : '';
  a.href = url;
  a.download = `${exam.title.replace(/[^a-zA-Z0-9äöüÄÖÜß\s]/g, '').replace(/\s+/g, '_')}${suffix}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
