const tank = document.getElementById('tank');
const TANK_HEIGHT = 600;
const WATER_LINE = 0;
const goldfish = [];
const flakes = [];
const hungerTooltip = document.getElementById('hungerTooltip');

function showHunger(e, hunger) {
    hungerTooltip.textContent = `Hunger: ${hunger}`;
    hungerTooltip.style.display = 'block';
    hungerTooltip.style.left = e.pageX + 10 + 'px';
    hungerTooltip.style.top = e.pageY + 10 + 'px';
}

function hideHunger() {
    hungerTooltip.style.display = 'none';
}

class Goldfish {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.hunger = 5;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.dead = false;
        this.element = document.createElement('div');
        this.element.className = 'goldfish';
        this.element.textContent = '🐠';
        this.element.style.left = x + 'px';
        this.element.style.top = y + 'px';
        tank.appendChild(this.element);
        
        this.element.addEventListener('mouseenter', (e) => {
            showHunger(e, this.hunger);
        });
        
        this.element.addEventListener('mousemove', (e) => {
            showHunger(e, this.hunger);
        });
        
        this.element.addEventListener('mouseleave', () => {
            hideHunger();
        });
        
        this.hungerInterval = setInterval(() => {
            if (!this.dead) {
                this.hunger = Math.max(0, this.hunger - 1);
                if (this.hunger === 0) this.die();
            }
        }, 60000);
    }
    
    update() {
        if (this.dead) {
            this.y += 1;
            if (this.y >= TANK_HEIGHT - 30) this.y = TANK_HEIGHT - 30;
        } else {
            const speedMultiplier = 1 + (this.hunger * 0.1);
            const target = this.findNearestFlake();
            
            if (target && this.hunger < 10) {
                const dx = target.x - (this.x + 20);
                const dy = target.y - (this.y + 12);
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0) {
                    this.vx = (dx / dist) * 2 * speedMultiplier;
                    this.vy = (dy / dist) * 2 * speedMultiplier;
                }
            } else {
                if (Math.random() < 0.02) {
                    this.vx = (Math.random() - 0.5) * 2 * speedMultiplier;
                    this.vy = (Math.random() - 0.5) * 2 * speedMultiplier;
                }
            }
            
            this.x += this.vx;
            this.y += this.vy;
            
            if (this.x <= 0 || this.x >= 760) this.vx *= -1;
            if (this.y <= 0 || this.y >= TANK_HEIGHT - 30) this.vy *= -1;
            
            this.x = Math.max(0, Math.min(760, this.x));
            this.y = Math.max(0, Math.min(TANK_HEIGHT - 30, this.y));
            
            this.checkFlakes();
        }
        
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';
        this.element.style.transform = this.vx > 0 ? 'scaleX(1)' : 'scaleX(-1)';
    }
    
    findNearestFlake() {
        if (this.hunger >= 10) return null;
        
        let nearest = null;
        let minDist = Infinity;
        
        for (const flake of flakes) {
            if (flake.atBottom || flake.eaten) continue;
            
            const dx = flake.x - (this.x + 20);
            const dy = flake.y - (this.y + 12);
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < minDist) {
                minDist = dist;
                nearest = flake;
            }
        }
        
        return nearest;
    }
    
    checkFlakes() {
        for (let i = flakes.length - 1; i >= 0; i--) {
            const flake = flakes[i];
            if (flake.atBottom || flake.eaten) continue;
            
            const dx = this.x + 20 - flake.x;
            const dy = this.y + 12 - flake.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 25 && this.hunger < 10) {
                this.hunger = Math.min(10, this.hunger + 1);
                flake.eaten = true;
                flake.element.remove();
                flakes.splice(i, 1);
            }
        }
    }
    
    die() {
        this.dead = true;
        this.element.classList.add('dead');
        clearInterval(this.hungerInterval);
        
        setTimeout(() => {
            this.element.classList.add('fade-out');
            setTimeout(() => {
                this.element.remove();
                const idx = goldfish.indexOf(this);
                if (idx > -1) goldfish.splice(idx, 1);
            }, 2000);
        }, 20000);
    }
}

class Flake {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.atBottom = false;
        this.eaten = false;
        this.element = document.createElement('div');
        this.element.className = 'flake';
        this.element.style.left = x + 'px';
        this.element.style.top = y + 'px';
        tank.appendChild(this.element);
    }
    
    update() {
        if (this.eaten) return;
        
        const speed = this.y < WATER_LINE ? 3 : 0.5;
        this.y += speed;
        
        if (this.y >= TANK_HEIGHT - 10) {
            this.y = TANK_HEIGHT - 10;
            if (!this.atBottom) {
                this.atBottom = true;
                setTimeout(() => {
                    this.element.classList.add('fade-out');
                    setTimeout(() => {
                        this.element.remove();
                        const idx = flakes.indexOf(this);
                        if (idx > -1) flakes.splice(idx, 1);
                    }, 2000);
                }, 20000);
            }
        }
        
        this.element.style.top = this.y + 'px';
    }
}

tank.addEventListener('click', (e) => {
    const rect = tank.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    goldfish.push(new Goldfish(x, y));
});

document.getElementById('feedBtn').addEventListener('click', () => {
    const x = Math.random() * 780 + 10;
    flakes.push(new Flake(x, 10));
});

function animate() {
    goldfish.forEach(fish => fish.update());
    flakes.forEach(flake => flake.update());
    requestAnimationFrame(animate);
}

animate();
