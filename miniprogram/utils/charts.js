/**
 * Canvas 2D 柱状图工具
 * 替代 Recharts，用于用量统计
 */

function drawBarChart(canvasId, ctx, data, options = {}) {
  const {
    width = 300,
    height = 200,
    padding = { top: 20, right: 20, bottom: 40, left: 60 },
    barColor = 'rgba(219, 164, 96, 0.8)',
    labelColor = '#948e83',
    valueColor = '#f6f3ec',
    gridColor = 'rgba(255, 255, 255, 0.06)',
  } = options;

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);

  if (!data || data.length === 0) {
    ctx.fillStyle = labelColor;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('暂无数据', width / 2, height / 2);
    return;
  }

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barW = Math.min(chartW / data.length * 0.6, 40);
  const gap = chartW / data.length;

  // Grid lines
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + chartH * (1 - i / 4);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    ctx.fillStyle = labelColor;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(maxVal * i / 4).toLocaleString(), padding.left - 8, y + 4);
  }

  // Bars
  data.forEach((d, i) => {
    const x = padding.left + gap * i + (gap - barW) / 2;
    const barH = (d.value / maxVal) * chartH;
    const y = padding.top + chartH - barH;

    // Bar gradient
    const grad = ctx.createLinearGradient(x, y, x, y + barH);
    grad.addColorStop(0, barColor);
    grad.addColorStop(1, 'rgba(219, 164, 96, 0.3)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
    ctx.fill();

    // Label
    ctx.fillStyle = labelColor;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.label, x + barW / 2, height - padding.bottom + 16);
  });
}

module.exports = { drawBarChart };
