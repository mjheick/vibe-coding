const canvas = document.getElementById('spaceCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let warpSpeed = false;
let stars = [];
let spaceObjects = [];
let offsetX = 0;
let offsetY = 0;

// Star class for the starfield effect
class Star {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.x = Math.random() * canvas.width - canvas.width / 2;
        this.y = Math.random() * canvas.height - canvas.height / 2;
        this.z = Math.random() * canvas.width;
        this.prevX = this.x;
        this.prevY = this.y;
    }
    
    update(speed) {
        this.prevX = this.x;
        this.prevY = this.y;
        
        this.z -= speed;
        
        if (this.z <= 0) {
            this.reset();
            this.z = canvas.width;
        }
    }
    
    draw() {
        const x = (this.x / this.z) * canvas.width + canvas.width / 2 + offsetX;
        const y = (this.y / this.z) * canvas.height + canvas.height / 2 + offsetY;
        
        const prevX = (this.prevX / (this.z + (warpSpeed ? 20 : 2))) * canvas.width + canvas.width / 2 + offsetX;
        const prevY = (this.prevY / (this.z + (warpSpeed ? 20 : 2))) * canvas.height + canvas.height / 2 + offsetY;
        
        const size = Math.max(0, (1 - this.z / canvas.width) * 3);
        const opacity = 1 - this.z / canvas.width;
        
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = size;
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.stroke();
    }
}

// Initialize stars
for (let i = 0; i < 800; i++) {
    stars.push(new Star());
}

// Space object class for planets, asteroids, etc.
class SpaceObject {
    constructor() {
        this.reset();
        this.type = this.getRandomType();
    }
    
    getRandomType() {
        const rand = Math.random();
        if (rand < 0.3) return 'planet';
        if (rand < 0.5) return 'galaxy';
        if (rand < 0.7) return 'asteroid';
        if (rand < 0.85) return 'nebula';
        return 'borg';
    }
    
    reset() {
        this.x = (Math.random() - 0.5) * canvas.width * 3;
        this.y = (Math.random() - 0.5) * canvas.height * 3;
        this.z = Math.random() * canvas.width * 2 + canvas.width;
        this.size = Math.random() * 40 + 20;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;
        this.color = this.getRandomColor();
    }
    
    getRandomColor() {
        const colors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', 
            '#6c5ce7', '#a29bfe', '#fd79a8', '#fdcb6e'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    update(speed) {
        if (!warpSpeed) return;
        
        this.z -= speed * 2;
        this.rotation += this.rotationSpeed;
        
        if (this.z <= 0) {
            this.reset();
            this.type = this.getRandomType();
        }
    }
    
    draw() {
        if (!warpSpeed) return;
        
        const scale = (1 - this.z / canvas.width);
        if (scale <= 0) return;
        
        const x = (this.x / this.z) * canvas.width + canvas.width / 2 + offsetX;
        const y = (this.y / this.z) * canvas.height + canvas.height / 2 + offsetY;
        const size = this.size * scale;
        const opacity = Math.min(scale * 2, 1);
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = opacity;
        
        switch(this.type) {
            case 'planet':
                this.drawPlanet(size);
                break;
            case 'galaxy':
                this.drawGalaxy(size);
                break;
            case 'asteroid':
                this.drawAsteroid(size);
                break;
            case 'nebula':
                this.drawNebula(size);
                break;
            case 'borg':
                this.drawBorgCube(size);
                break;
        }
        
        ctx.restore();
    }
    
    drawPlanet(size) {
        // Planet body
        const gradient = ctx.createRadialGradient(-size * 0.2, -size * 0.2, 0, 0, 0, size);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, '#000');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Atmosphere glow
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.stroke();
        
        // Surface details
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(0, 0, size * (0.4 + i * 0.2), 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    drawGalaxy(size) {
        // Spiral galaxy
        const arms = 3;
        ctx.strokeStyle = this.color;
        
        for (let arm = 0; arm < arms; arm++) {
            ctx.beginPath();
            const armAngle = (Math.PI * 2 / arms) * arm;
            
            for (let i = 0; i < 50; i++) {
                const angle = armAngle + i * 0.3;
                const radius = (i / 50) * size;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            
            ctx.lineWidth = size * 0.1;
            ctx.stroke();
        }
        
        // Bright center
        const centerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.3);
        centerGlow.addColorStop(0, '#fff');
        centerGlow.addColorStop(1, this.color);
        ctx.fillStyle = centerGlow;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawAsteroid(size) {
        // Irregular asteroid shape
        ctx.strokeStyle = '#888';
        ctx.fillStyle = '#444';
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        const points = 8;
        for (let i = 0; i < points; i++) {
            const angle = (Math.PI * 2 / points) * i;
            const radius = size * (0.7 + Math.random() * 0.3);
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Craters
        ctx.fillStyle = '#222';
        for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * size * 0.5;
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, size * 0.15, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawNebula(size) {
        // Colorful nebula cloud
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.5);
        gradient.addColorStop(0, this.color);
        
        // Convert hex to rgba properly
        let r, g, b;
        if (this.color.startsWith('#')) {
            r = parseInt(this.color.slice(1, 3), 16);
            g = parseInt(this.color.slice(3, 5), 16);
            b = parseInt(this.color.slice(5, 7), 16);
        }
        gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.5)`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        
        // Multiple overlapping clouds
        for (let i = 0; i < 3; i++) {
            const offsetX = (Math.random() - 0.5) * size;
            const offsetY = (Math.random() - 0.5) * size;
            ctx.beginPath();
            ctx.arc(offsetX, offsetY, size * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawBorgCube(size) {
        // Borg cube wireframe
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        
        // Main cube outline
        const s = size * 0.7;
        ctx.strokeRect(-s, -s, s * 2, s * 2);
        
        // Grid pattern
        ctx.lineWidth = 1;
        const divisions = 4;
        for (let i = 1; i < divisions; i++) {
            const pos = -s + (s * 2 / divisions) * i;
            // Vertical lines
            ctx.beginPath();
            ctx.moveTo(pos, -s);
            ctx.lineTo(pos, s);
            ctx.stroke();
            // Horizontal lines
            ctx.beginPath();
            ctx.moveTo(-s, pos);
            ctx.lineTo(s, pos);
            ctx.stroke();
        }
        
        // Borg green glow
        const borgGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        borgGlow.addColorStop(0, 'rgba(0, 255, 0, 0.3)');
        borgGlow.addColorStop(1, 'rgba(0, 255, 0, 0)');
        ctx.fillStyle = borgGlow;
        ctx.fillRect(-size, -size, size * 2, size * 2);
        
        // Corner lights
        ctx.fillStyle = '#00ff00';
        const corners = [[-s, -s], [s, -s], [-s, s], [s, s]];
        corners.forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x, y, size * 0.1, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

// Enterprise wireframe model
class Enterprise {
    constructor() {
        this.scale = 80;
        this.x = canvas.width / 2;
        this.y = canvas.height / 2 + 180;
        this.glowIntensity = 0;
    }
    
    draw() {
        ctx.save();
        ctx.translate(this.x + offsetX * 0.3, this.y + offsetY * 0.3);
        
        // Animate glow
        this.glowIntensity = Math.sin(Date.now() / 200) * 0.3 + 0.7;
        
        // Draw from back to front for proper layering
        
        // Nacelle pylons (back struts)
        ctx.strokeStyle = '#5ab3ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-this.scale * 0.35, this.scale * 0.45);
        ctx.lineTo(-this.scale * 0.75, this.scale * 0.2);
        ctx.moveTo(this.scale * 0.35, this.scale * 0.45);
        ctx.lineTo(this.scale * 0.75, this.scale * 0.2);
        ctx.stroke();
        
        // Warp nacelles with glow (draw first so they're behind)
        this.drawNacelle(-this.scale * 0.75, this.scale * 0.2, warpSpeed);
        this.drawNacelle(this.scale * 0.75, this.scale * 0.2, warpSpeed);
        
        // Engineering hull (cylindrical section)
        ctx.strokeStyle = '#6bc4ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, this.scale * 0.7, this.scale * 0.22, this.scale * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();
        
        // Engineering hull details
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const yPos = this.scale * 0.45 + i * this.scale * 0.15;
            ctx.beginPath();
            ctx.ellipse(0, yPos, this.scale * 0.22, this.scale * 0.08, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Impulse engines
        this.drawImpulseEngines(0, this.scale * 0.95, !warpSpeed);
        
        // Neck connecting saucer to engineering
        ctx.strokeStyle = '#6bc4ff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-this.scale * 0.08, this.scale * 0.25);
        ctx.lineTo(-this.scale * 0.12, this.scale * 0.4);
        ctx.lineTo(this.scale * 0.12, this.scale * 0.4);
        ctx.lineTo(this.scale * 0.08, this.scale * 0.25);
        ctx.stroke();
        
        // Saucer section (primary hull)
        ctx.strokeStyle = '#7dd3ff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.scale * 0.9, this.scale * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();
        
        // Saucer inner ring
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.scale * 0.6, this.scale * 0.23, 0, 0, Math.PI * 2);
        ctx.stroke();
        
        // Saucer center detail
        ctx.beginPath();
        ctx.ellipse(0, 0, this.scale * 0.25, this.scale * 0.1, 0, 0, Math.PI * 2);
        ctx.stroke();
        
        // Bridge dome
        ctx.fillStyle = '#4a9eff';
        ctx.beginPath();
        ctx.arc(0, -this.scale * 0.05, this.scale * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Saucer grid lines
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = '#5ab3ff';
        for (let i = -3; i <= 3; i++) {
            if (i === 0) continue;
            ctx.beginPath();
            ctx.moveTo(i * this.scale * 0.25, -this.scale * 0.3);
            ctx.lineTo(i * this.scale * 0.25, this.scale * 0.3);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    drawNacelle(x, y, active) {
        // Nacelle body (elongated cylinder)
        ctx.strokeStyle = '#5ab3ff';
        ctx.lineWidth = 2;
        
        // Main nacelle housing
        ctx.beginPath();
        ctx.moveTo(x - this.scale * 0.12, y - this.scale * 0.05);
        ctx.lineTo(x - this.scale * 0.12, y + this.scale * 0.55);
        ctx.lineTo(x + this.scale * 0.12, y + this.scale * 0.55);
        ctx.lineTo(x + this.scale * 0.12, y - this.scale * 0.05);
        ctx.closePath();
        ctx.stroke();
        
        // Nacelle segments
        ctx.lineWidth = 1;
        for (let i = 1; i < 5; i++) {
            const segY = y + i * this.scale * 0.12;
            ctx.beginPath();
            ctx.moveTo(x - this.scale * 0.12, segY);
            ctx.lineTo(x + this.scale * 0.12, segY);
            ctx.stroke();
        }
        
        // Bussard collector (front dome)
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(x, y, this.scale * 0.12, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner collector ring
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, this.scale * 0.08, 0, Math.PI * 2);
        ctx.stroke();
        
        if (active) {
            // Warp field glow along nacelle
            const gradient = ctx.createLinearGradient(x, y, x, y + this.scale * 0.6);
            gradient.addColorStop(0, `rgba(100, 200, 255, ${this.glowIntensity * 0.6})`);
            gradient.addColorStop(0.5, `rgba(100, 200, 255, ${this.glowIntensity * 0.9})`);
            gradient.addColorStop(1, `rgba(100, 200, 255, ${this.glowIntensity * 0.3})`);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x - this.scale * 0.12, y, this.scale * 0.24, this.scale * 0.55);
            
            // Bussard collector glow
            const bussardGlow = ctx.createRadialGradient(x, y, 0, x, y, this.scale * 0.2);
            bussardGlow.addColorStop(0, `rgba(255, 100, 100, ${this.glowIntensity})`);
            bussardGlow.addColorStop(0.5, `rgba(255, 80, 80, ${this.glowIntensity * 0.6})`);
            bussardGlow.addColorStop(1, 'rgba(255, 60, 60, 0)');
            
            ctx.fillStyle = bussardGlow;
            ctx.beginPath();
            ctx.arc(x, y, this.scale * 0.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawImpulseEngines(x, y, active) {
        const engineWidth = this.scale * 0.12;
        const engineHeight = this.scale * 0.08;
        const spacing = 8;
        
        ctx.strokeStyle = '#5ab3ff';
        ctx.lineWidth = 1.5;
        
        // Left engine
        ctx.beginPath();
        ctx.rect(x - engineWidth - spacing, y, engineWidth, engineHeight);
        ctx.stroke();
        
        // Right engine
        ctx.beginPath();
        ctx.rect(x + spacing, y, engineWidth, engineHeight);
        ctx.stroke();
        
        if (active) {
            // Impulse exhaust glow
            const glowGradient = ctx.createRadialGradient(x, y + engineHeight / 2, 0, x, y + engineHeight / 2, this.scale * 0.5);
            glowGradient.addColorStop(0, `rgba(255, 180, 80, ${this.glowIntensity})`);
            glowGradient.addColorStop(0.4, `rgba(255, 120, 40, ${this.glowIntensity * 0.7})`);
            glowGradient.addColorStop(0.7, `rgba(255, 80, 20, ${this.glowIntensity * 0.3})`);
            glowGradient.addColorStop(1, 'rgba(255, 60, 10, 0)');
            
            ctx.fillStyle = glowGradient;
            ctx.fillRect(x - this.scale * 0.5, y - this.scale * 0.2, this.scale, this.scale * 0.6);
        }
    }
}

const enterprise = new Enterprise();

// Initialize space objects
for (let i = 0; i < 20; i++) {
    spaceObjects.push(new SpaceObject());
}

// Handle keyboard input
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ') {
        e.preventDefault();
        warpSpeed = !warpSpeed;
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});



function animate() {
    // Semi-transparent black for trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Handle maneuvering
    if (keys['ArrowLeft']) offsetX += 5;
    if (keys['ArrowRight']) offsetX -= 5;
    if (keys['ArrowUp']) offsetY += 5;
    if (keys['ArrowDown']) offsetY -= 5;
    
    // Gradually center the view
    offsetX *= 0.95;
    offsetY *= 0.95;
    
    const speed = warpSpeed ? 20 : 2;
    
    stars.forEach(star => {
        star.update(speed);
        star.draw();
    });
    
    // Draw space objects
    spaceObjects.forEach(obj => {
        obj.update(speed);
        obj.draw();
    });
    
    // Draw the Enterprise in front of the stars
    enterprise.draw();
    
    requestAnimationFrame(animate);
}

// Handle window resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    enterprise.x = canvas.width / 2;
    enterprise.y = canvas.height / 2 + 180;
});

animate();
