const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

const hexagons = [
    { x: 200, y: 300, color: '#FF0000', id: 1 },
    { x: 400, y: 300, color: '#00FF00', id: 2 },
    { x: 600, y: 300, color: '#0000FF', id: 3 }
];

let draggedHex = null;
let dragOffset = { x: 0, y: 0 };
let nextId = 4;
let hoveredHex = null;
let mousePos = { x: 0, y: 0 };
let triangles = [];

const HEX_RADIUS = 40;

function drawHexagon(x, y, radius, color) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const hx = x + radius * Math.cos(angle);
        const hy = y + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fill();
}

function isPointInHexagon(px, py, hex) {
    const dx = px - hex.x;
    const dy = py - hex.y;
    return Math.sqrt(dx * dx + dy * dy) < HEX_RADIUS;
}

function mixColors(color1, color2) {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    
    const r = Math.round((r1 + r2) / 2);
    const g = Math.round((g1 + g2) / 2);
    const b = Math.round((b1 + b2) / 2);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function checkOverlap(x, y, excludeHex) {
    for (let hex of hexagons) {
        if (hex === excludeHex) continue;
        const dx = x - hex.x;
        const dy = y - hex.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < HEX_RADIUS * 2) return true;
    }
    return false;
}

function clampToCanvas(x, y) {
    return {
        x: Math.max(HEX_RADIUS, Math.min(canvas.width - HEX_RADIUS, x)),
        y: Math.max(HEX_RADIUS, Math.min(canvas.height - HEX_RADIUS, y))
    };
}

function findValidPosition(startX, startY, excludeHex) {
    const clamped = clampToCanvas(startX, startY);
    
    if (!checkOverlap(clamped.x, clamped.y, excludeHex)) {
        return clamped;
    }
    
    const minDist = HEX_RADIUS * 2.2;
    for (let radius = minDist; radius < 300; radius += 20) {
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
            const x = clamped.x + Math.cos(angle) * radius;
            const y = clamped.y + Math.sin(angle) * radius;
            
            if (x < HEX_RADIUS || x > canvas.width - HEX_RADIUS) continue;
            if (y < HEX_RADIUS || y > canvas.height - HEX_RADIUS) continue;
            
            if (!checkOverlap(x, y, excludeHex)) {
                return { x, y };
            }
        }
    }
    
    return clamped;
}

function separateHexagons(hex1, hex2, newHex) {
    const centerX = (hex1.x + hex2.x) / 2;
    const centerY = (hex1.y + hex2.y) / 2;
    
    const angle1 = Math.atan2(hex1.y - centerY, hex1.x - centerX);
    const angle2 = Math.atan2(hex2.y - centerY, hex2.x - centerX);
    const angle3 = angle1 + Math.PI * 2 / 3;
    
    const dist = HEX_RADIUS * 2.5;
    
    // Temporarily remove all three from collision checks
    const tempHexagons = hexagons.filter(h => h !== hex1 && h !== hex2 && h !== newHex);
    const originalHexagons = [...hexagons];
    hexagons.length = 0;
    hexagons.push(...tempHexagons);
    
    const pos1 = findValidPosition(centerX + Math.cos(angle1) * dist, centerY + Math.sin(angle1) * dist, null);
    hex1.x = pos1.x;
    hex1.y = pos1.y;
    hexagons.push(hex1);
    
    const pos2 = findValidPosition(centerX + Math.cos(angle2) * dist, centerY + Math.sin(angle2) * dist, null);
    hex2.x = pos2.x;
    hex2.y = pos2.y;
    hexagons.push(hex2);
    
    const pos3 = findValidPosition(centerX + Math.cos(angle3) * dist, centerY + Math.sin(angle3) * dist, null);
    newHex.x = pos3.x;
    newHex.y = pos3.y;
    hexagons.push(newHex);
}

function updateScoreboard() {
    const uniqueColors = new Set(hexagons.map(h => h.color));
    document.getElementById('totalCount').textContent = hexagons.length;
    document.getElementById('uniqueCount').textContent = uniqueColors.size;
}

function drawColorLabel(x, y, color) {
    ctx.save();
    ctx.font = '14px monospace';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    
    const text = color.toUpperCase();
    const metrics = ctx.measureText(text);
    const padding = 6;
    const boxWidth = metrics.width + padding * 2;
    const boxHeight = 20;
    
    const labelX = x + 15;
    const labelY = y - 15;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(labelX, labelY - boxHeight, boxWidth, boxHeight);
    
    ctx.fillStyle = '#fff';
    ctx.fillText(text, labelX + padding, labelY - 5);
    ctx.restore();
}

function drawTriangle(triangle) {
    const elapsed = Date.now() - triangle.startTime;
    const opacity = Math.max(0, 1 - elapsed / 500);
    
    if (opacity > 0) {
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(triangle.p1.x, triangle.p1.y);
        ctx.lineTo(triangle.p2.x, triangle.p2.y);
        ctx.lineTo(triangle.p3.x, triangle.p3.y);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
        return true;
    }
    return false;
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    triangles = triangles.filter(triangle => drawTriangle(triangle));
    
    hexagons.forEach(hex => {
        drawHexagon(hex.x, hex.y, HEX_RADIUS, hex.color);
    });
    
    if (hoveredHex && !draggedHex) {
        drawColorLabel(mousePos.x, mousePos.y, hoveredHex.color);
    }
    
    updateScoreboard();
    
    if (triangles.length > 0) {
        requestAnimationFrame(render);
    }
}

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    for (let i = hexagons.length - 1; i >= 0; i--) {
        if (isPointInHexagon(mx, my, hexagons[i])) {
            draggedHex = hexagons[i];
            dragOffset.x = mx - draggedHex.x;
            dragOffset.y = my - draggedHex.y;
            hoveredHex = null;
            break;
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    mousePos.x = mx;
    mousePos.y = my;
    
    if (draggedHex) {
        draggedHex.x = Math.max(HEX_RADIUS, Math.min(canvas.width - HEX_RADIUS, mx - dragOffset.x));
        draggedHex.y = Math.max(HEX_RADIUS, Math.min(canvas.height - HEX_RADIUS, my - dragOffset.y));
    } else {
        hoveredHex = null;
        for (let i = hexagons.length - 1; i >= 0; i--) {
            if (isPointInHexagon(mx, my, hexagons[i])) {
                hoveredHex = hexagons[i];
                break;
            }
        }
    }
    
    render();
});

canvas.addEventListener('mouseup', (e) => {
    if (draggedHex) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        
        let merged = false;
        for (let hex of hexagons) {
            if (hex !== draggedHex && isPointInHexagon(mx, my, hex)) {
                const newColor = mixColors(draggedHex.color, hex.color);
                const newHex = { x: mx, y: my, color: newColor, id: nextId++ };
                hexagons.push(newHex);
                separateHexagons(draggedHex, hex, newHex);
                
                triangles.push({
                    p1: { x: draggedHex.x, y: draggedHex.y },
                    p2: { x: hex.x, y: hex.y },
                    p3: { x: newHex.x, y: newHex.y },
                    startTime: Date.now()
                });
                
                merged = true;
                break;
            }
        }
        
        if (!merged && checkOverlap(draggedHex.x, draggedHex.y, draggedHex)) {
            const validPos = findValidPosition(draggedHex.x, draggedHex.y, draggedHex);
            draggedHex.x = validPos.x;
            draggedHex.y = validPos.y;
        }
        
        draggedHex = null;
        render();
    }
});

render();
