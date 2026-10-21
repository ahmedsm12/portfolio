/**
 * Interactive Visual Path Drawing & Editing Tool
 * Allows users to click on the canvas to create points and curves,
 * drag handles, and generate SVG motion paths without code.
 */

let activePathEditor = null;

export function startInteractivePathDrawing(onComplete) {
  if (activePathEditor) {
    activePathEditor.close();
  }

  const stage = document.getElementById('stage') || document.querySelector('.stage') || document.body;

  // Create overlay container
  const overlay = document.createElement('div');
  overlay.className = 'ipb-path-editor-overlay';
  overlay.style.position = 'absolute';
  overlay.style.inset = '0';
  overlay.style.zIndex = '1200';
  overlay.style.cursor = 'crosshair';
  overlay.style.userSelect = 'none';

  // Path SVG
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.overflow = 'visible';

  const previewPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  previewPath.setAttribute('fill', 'none');
  previewPath.setAttribute('stroke', '#3b82f6');
  previewPath.setAttribute('stroke-width', '4');
  previewPath.setAttribute('stroke-linecap', 'round');
  previewPath.setAttribute('stroke-dasharray', '8 4');
  previewPath.style.filter = 'drop-shadow(0 0 8px rgba(59,130,246,0.8))';
  svg.appendChild(previewPath);

  const pointsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(pointsGroup);
  overlay.appendChild(svg);

  // Top floating instructions and control bar
  const banner = document.createElement('div');
  banner.className = 'ipb-path-banner';
  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;background:#1e293b;color:#fff;padding:8px 16px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.6);border:1px solid #3b82f6;font-size:12.5px">
      <span>✏️ <strong>رسم مسار الحركة:</strong> انقر في الكانفاس لتحديد النقاط (<span id="pathPtCount">0</span> نقاط)</span>
      <button type="button" id="btnFinishPath" style="background:#2563eb;color:#fff;border:none;border-radius:6px;padding:5px 12px;font-size:12px;cursor:pointer;font-weight:600">✓ اعتماد المسار</button>
      <button type="button" id="btnCancelPath" style="background:transparent;color:#94a3b8;border:1px solid #475569;border-radius:6px;padding:5px 10px;font-size:12px;cursor:pointer">✕ إلغاء</button>
    </div>
  `;
  banner.style.position = 'absolute';
  banner.style.top = '14px';
  banner.style.left = '50%';
  banner.style.transform = 'translateX(-50%)';
  banner.style.zIndex = '1205';
  overlay.appendChild(banner);

  stage.appendChild(overlay);

  const points = [];

  function updatePath() {
    if (points.length < 2) {
      previewPath.setAttribute('d', '');
      return;
    }

    let d = `M ${points[0].x} ${points[0].y}`;
    if (points.length === 2) {
      d += ` L ${points[1].x} ${points[1].y}`;
    } else {
      // Build smooth cubic or quadratic bezier spline through points
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const mx = (prev.x + curr.x) / 2;
        const my = (prev.y + curr.y) / 2;
        d += ` Q ${prev.x} ${prev.y} ${mx} ${my}`;
      }
      const last = points[points.length - 1];
      d += ` L ${last.x} ${last.y}`;
    }
    previewPath.setAttribute('d', d);

    // Update markers
    pointsGroup.innerHTML = '';
    points.forEach((pt, index) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(pt.x));
      circle.setAttribute('cy', String(pt.y));
      circle.setAttribute('r', '7');
      circle.setAttribute('fill', index === 0 ? '#10b981' : (index === points.length - 1 ? '#ef4444' : '#3b82f6'));
      circle.setAttribute('stroke', '#ffffff');
      circle.setAttribute('stroke-width', '2');
      circle.style.cursor = 'grab';
      pointsGroup.appendChild(circle);

      // Node number label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(pt.x));
      text.setAttribute('y', String(pt.y - 12));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#ffffff');
      text.setAttribute('font-size', '10');
      text.setAttribute('font-weight', 'bold');
      text.textContent = index === 0 ? 'البداية' : (index === points.length - 1 ? 'النهاية' : `${index + 1}`);
      pointsGroup.appendChild(text);
    });

    const countEl = document.getElementById('pathPtCount');
    if (countEl) countEl.textContent = String(points.length);
  }

  // Pointer click adds a point
  overlay.addEventListener('pointerdown', (e) => {
    if (e.target.closest('#btnFinishPath') || e.target.closest('#btnCancelPath')) return;

    // Get stage coordinates
    const r = stage.getBoundingClientRect();
    const x = Math.round(e.clientX - r.left);
    const y = Math.round(e.clientY - r.top);

    points.push({ x, y });
    updatePath();
  });

  const finish = () => {
    const d = previewPath.getAttribute('d');
    overlay.remove();
    activePathEditor = null;
    if (d && onComplete) onComplete(d);
  };

  const cancel = () => {
    overlay.remove();
    activePathEditor = null;
  };

  const finishBtn = banner.querySelector('#btnFinishPath');
  const cancelBtn = banner.querySelector('#btnCancelPath');
  if (finishBtn) finishBtn.addEventListener('click', finish);
  if (cancelBtn) cancelBtn.addEventListener('click', cancel);

  activePathEditor = {
    close: cancel,
  };
}
