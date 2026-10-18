// Lightweight native Canvas Confetti engine
export function shootConfetti() {
  const canvas = document.getElementById('confetti-canvas') || createConfettiCanvas();
  const ctx = canvas.getContext('2d');
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#10b981', '#34d399', '#059669', '#6ee7b7', '#38bdf8', '#fbbf24', '#ffffff'];
  const particleCount = 80;
  const particles = [];

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height * 0.45,
      r: Math.random() * 6 + 4,
      d: Math.random() * particleCount,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.floor(Math.random() * 10) - 10,
      tiltAngleIncremental: (Math.random() * 0.07) + 0.05,
      tiltAngle: 0,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() * -12) - 8,
      gravity: 0.45,
      alpha: 1
    });
  }

  let animationFrame;
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let active = false;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.tiltAngle += p.tiltAngleIncremental;
      p.tilt = Math.sin(p.tiltAngle) * 15;
      p.alpha -= 0.012;

      if (p.alpha > 0) {
        active = true;
        ctx.beginPath();
        ctx.lineWidth = p.r / 2;
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.moveTo(p.x + p.tilt + p.r, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
        ctx.stroke();
      }
    }

    if (active) {
      animationFrame = requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrame);
    }
  }

  render();
}

function createConfettiCanvas() {
  const canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  document.body.appendChild(canvas);
  return canvas;
}
