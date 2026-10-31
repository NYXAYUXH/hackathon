/**
 * NIGHTSTOCK Atmosphere Engine: Flying Bats & Ambient Particles
 * Silky-smooth, low-CPU canvas animation with flying bats gliding across the void.
 * Instant value updates (no annoying prolonged count-up / typewriter lag).
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

    let fxEnabled = localStorage.getItem('nightstock_fx_enabled') !== 'false';

    // -------------------------------------------------------------
    // 1. SILKY-SMOOTH FLYING BATS
    // -------------------------------------------------------------
    class FlyingBat {
        constructor() {
            this.reset(true);
        }

        reset(initial = false) {
            // Bats spawn from left or right and fly across
            this.direction = Math.random() > 0.5 ? 1 : -1;
            this.x = initial ? Math.random() * width : (this.direction === 1 ? -60 : width + 60);
            this.y = 30 + Math.random() * (height * 0.7);
            this.vx = (1.2 + Math.random() * 1.6) * this.direction;
            this.vy = (Math.random() - 0.5) * 0.7;
            this.size = 11 + Math.random() * 12;
            this.wingSpeed = 0.16 + Math.random() * 0.12;
            this.wingPhase = Math.random() * Math.PI * 2;
            this.opacity = 0.18 + Math.random() * 0.22;
            this.bobSpeed = 0.03 + Math.random() * 0.03;
            this.bobPhase = Math.random() * Math.PI * 2;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy + Math.sin(this.bobPhase) * 0.4;
            this.wingPhase += this.wingSpeed;
            this.bobPhase += this.bobSpeed;

            // Screen wrap
            if (this.direction === 1 && this.x > width + 70) {
                this.reset();
            } else if (this.direction === -1 && this.x < -70) {
                this.reset();
            }

            if (this.y < -30) this.y = height * 0.75;
            if (this.y > height * 0.85) this.y = -20;
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            if (this.direction === -1) ctx.scale(-1, 1);

            const flap = Math.sin(this.wingPhase);
            ctx.fillStyle = `rgba(168, 85, 247, ${this.opacity})`;

            // Aerodynamic Bat Silhouette
            ctx.beginPath();
            // Body and head
            ctx.ellipse(0, 0, this.size * 0.24, this.size * 0.44, 0, 0, Math.PI * 2);
            // Left wing
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(-this.size * 0.8, -this.size * (0.6 + flap * 0.45), -this.size * 1.5, -this.size * (0.15 + flap * 0.5));
            ctx.quadraticCurveTo(-this.size * 0.8, this.size * 0.2, 0, this.size * 0.2);
            // Right wing
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(this.size * 0.8, -this.size * (0.6 + flap * 0.45), this.size * 1.5, -this.size * (0.15 + flap * 0.5));
            ctx.quadraticCurveTo(this.size * 0.8, this.size * 0.2, 0, this.size * 0.2);

            ctx.fill();
            ctx.restore();
        }
    }

    // -------------------------------------------------------------
    // 2. SUBTLE FLOATING AMBIENT EMBERS
    // -------------------------------------------------------------
    class AmbientMote {
        constructor() {
            this.reset(true);
        }

        reset(initial = false) {
            this.x = Math.random() * width;
            this.y = initial ? Math.random() * height : height + 10;
            this.vx = (Math.random() - 0.5) * 0.35;
            this.vy = -(0.3 + Math.random() * 0.5);
            this.radius = 1.0 + Math.random() * 1.6;
            this.isOrange = Math.random() > 0.5;
            this.alpha = 0.15 + Math.random() * 0.25;
            this.fadeSpeed = 0.001 + Math.random() * 0.0015;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.alpha -= this.fadeSpeed;
            if (this.alpha <= 0 || this.y < -10 || this.x < -10 || this.x > width + 10) {
                this.reset();
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.isOrange 
                ? `rgba(249, 115, 22, ${this.alpha})`
                : `rgba(168, 85, 247, ${this.alpha})`;
            ctx.fill();
        }
    }

    // 8 gracefully flying bats and 14 ambient motes
    const bats = Array.from({ length: 8 }, () => new FlyingBat());
    const motes = Array.from({ length: 14 }, () => new AmbientMote());
    let animationFrameId = null;

    function renderLoop() {
        if (!fxEnabled) {
            ctx.clearRect(0, 0, width, height);
            return;
        }

        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < motes.length; i++) {
            motes[i].update();
            motes[i].draw();
        }

        for (let i = 0; i < bats.length; i++) {
            bats[i].update();
            bats[i].draw();
        }

        animationFrameId = requestAnimationFrame(renderLoop);
    }

    if (fxEnabled) {
        renderLoop();
    }

    // Toggle FX Function
    window.toggleAmbientFX = function () {
        fxEnabled = !fxEnabled;
        localStorage.setItem('nightstock_fx_enabled', fxEnabled ? 'true' : 'false');
        if (fxEnabled) {
            if (!animationFrameId) renderLoop();
        } else {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            ctx.clearRect(0, 0, width, height);
        }
        return fxEnabled;
    };

    window.isAmbientFXEnabled = function () {
        return fxEnabled;
    };

    window.triggerLightningFlash = function () {
        const flashOverlay = document.getElementById('lightning-flash');
        if (!flashOverlay) return;

        if (window.soundEngine) {
            window.soundEngine.playThunder();
        }

        flashOverlay.classList.remove('active');
        void flashOverlay.offsetWidth;
        flashOverlay.classList.add('active');
    };

    // Instant / Near-instant value update (REDUCED AUTO-WRITING / COUNTING DELAY)
    window.animateValue = function (id, start, end, duration = 0, prefix = '', suffix = '') {
        const obj = document.getElementById(id);
        if (!obj) return;
        // Direct, instant render to eliminate typewriter/number-rolling delay!
        obj.textContent = `${prefix}${typeof end === 'number' ? end.toLocaleString() : end}${suffix}`;
    };

    window.spawnEctoplasmBurst = function () {
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 25,
                spread: 55,
                origin: { y: 0.8 },
                colors: ['#f97316', '#a855f7', '#10b981'],
                disableForReducedMotion: true
            });
        }
    };

    window.refreshCardTilt = function () {};
})();
