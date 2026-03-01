const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let R, r, d, t, speed, hue, prevX, prevY;

function initSpirograph() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Spirograph parameters - scaled to window size
    const scale = Math.min(canvas.width, canvas.height) / 3;
    R = Math.random() * scale * 0.6 + scale * 0.4; // Outer circle radius
    r = Math.random() * scale * 0.3 + scale * 0.2; // Inner circle radius
    d = Math.random() * scale * 0.3 + scale * 0.2; // Distance from inner circle center
    
    t = 0;
    // Keep current speed, only reset if undefined
    if (speed === undefined) speed = 0.02;
    hue = Math.random() * 360;
    prevX = null;
    prevY = null;
}

initSpirograph();

function drawPoint() {
    // Spirograph parametric equations
    const x = canvas.width / 2 + (R - r) * Math.cos(t) + d * Math.cos((R - r) / r * t);
    const y = canvas.height / 2 + (R - r) * Math.sin(t) - d * Math.sin((R - r) / r * t);
    
    // Random color that shifts
    hue = (hue + Math.random() * 5) % 360;
    ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
    ctx.lineWidth = 2;
    
    if (prevX !== null && prevY !== null) {
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.stroke();
    }
    
    prevX = x;
    prevY = y;
    t += speed;
}

function animate() {
    drawPoint();
    requestAnimationFrame(animate);
}

function updateSpeedDisplay() {
    document.getElementById('speedDisplay').textContent = speed.toFixed(3);
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (e.key === '+' || e.key === '=') {
        speed = Math.min(speed + 0.01, 0.5);
        updateSpeedDisplay();
    } else if (e.key === '-' || e.key === '_') {
        speed = Math.max(speed - 0.01, 0.001);
        updateSpeedDisplay();
    }
});

// Button controls
document.getElementById('resetBtn').addEventListener('click', initSpirograph);
document.getElementById('slowerBtn').addEventListener('click', () => {
    speed = Math.max(speed - 0.01, 0.001);
    updateSpeedDisplay();
});
document.getElementById('fasterBtn').addEventListener('click', () => {
    speed = Math.min(speed + 0.01, 0.5);
    updateSpeedDisplay();
});

updateSpeedDisplay();

// Handle window resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initSpirograph();
});

animate();
