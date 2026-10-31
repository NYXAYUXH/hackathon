/**
 * NIGHTSTOCK Bats & Embers Particle Canvas
 * Subtle, atmospheric Halloween background visual effect.
 */

(function () {
    const canvas = document.getElementById('spooky-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    // Bats class
    class Bat {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * (height * 0.7);
            this.vx = (Math.random() - 0.5) * 1.5;
            this.vy = (Math.random() - 0.5) * 0.8;
            this.size = 12 + Math.random() * 14;
            this.wingSpeed = 0.15 + Math.random() * 0.15;
            this.wingPhase = Math.random() * Math.PI * 2;
            this.opacity = 0.12 + Math.random() * 0.22;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.wingPhase += this.wingSpeed;

            // Soft screen wrap
            if (this.x < -40) this.x = width + 40;
            if (this.x > width + 40) this.x = -40;
            if (this.y < -20) this.y = height * 0.6;
            if (this.y > height * 0.75) this.y = -10;
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            const flap = Math.sin(this.wingPhase);
            ctx.fillStyle = `rgba(168, 85, 247, ${this.opacity})`;

            // Draw stylized bat silhouette
            ctx.beginPath();
            // Body
            ctx.ellipse(0, 0, this.size * 0.25, this.size * 0.45, 0, 0, Math.PI * 2);
            // Left wing
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(-this.size * 0.8, -this.size * (0.6 + flap * 0.4), -this.size * 1.4, -this.size * (0.2 + flap * 0.5));
            ctx.quadraticCurveTo(-this.size * 0.7, this.size * 0.2, 0, this.size * 0.2);
            // Right wing
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(this.size * 0.8, -this.size * (0.6 + flap * 0.4), this.size * 1.4, -this.size * (0.2 + flap * 0.5));
            ctx.quadraticCurveTo(this.size * 0.7, this.size * 0.2, 0, this.size * 0.2);

            ctx.fill();
            ctx.restore();
        }
    }

    // Floating Embers class
    class Ember {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = height + 10 + Math.random() * 50;
            this.vx = (Math.random() - 0.5) * 0.6;
            this.vy = -(0.5 + Math.random() * 1.2);
            this.radius = 1.0 + Math.random() * 2.2;
            this.color = Math.random() > 0.4 ? 'rgba(255, 106, 0, ' : 'rgba(0, 255, 136, ';
            this.alpha = 0.2 + Math.random() * 0.5;
            this.fadeSpeed = 0.002 + Math.random() * 0.003;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.alpha -= this.fadeSpeed;
            if (this.alpha <= 0 || this.y < -10) {
                this.reset();
            }
        }

        draw() {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `${this.color}${this.alpha})`;
            ctx.shadowColor = this.color.includes('255, 106') ? '#ff6a00' : '#00ff88';
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.restore();
        }
    }

    const bats = Array.from({ length: 9 }, () => new Bat());
    const embers = Array.from({ length: 35 }, () => new Ember());

    let animationRunning = true;

    function renderLoop() {
        if (!animationRunning) return;
        ctx.clearRect(0, 0, width, height);

        embers.forEach(ember => {
            ember.update();
            ember.draw();
        });

        bats.forEach(bat => {
            bat.update();
            bat.draw();
        });

        requestAnimationFrame(renderLoop);
    }

    renderLoop();

    // Expose toggle
    window.toggleBats = function () {
        animationRunning = !animationRunning;
        if (animationRunning) renderLoop();
        return animationRunning;
    };
})();
