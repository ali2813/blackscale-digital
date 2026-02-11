/* ============================================
   BlackScale Digital Solutions — Script
   Animated Wave Canvas + Particles + UI Logic
   ============================================ */

(function() {
    'use strict';

    // ============================================
    // Wave Canvas Animation
    // ============================================
    const waveCanvas = document.getElementById('waveCanvas');
    const wCtx = waveCanvas.getContext('2d');

    function resizeWaveCanvas() {
        waveCanvas.width = window.innerWidth;
        waveCanvas.height = window.innerHeight;
    }
    resizeWaveCanvas();

    const waves = [
        { y: 0.65, length: 0.008, amplitude: 60, speed: 0.015, color: 'rgba(108, 63, 255, 0.08)', offset: 0 },
        { y: 0.70, length: 0.006, amplitude: 45, speed: 0.012, color: 'rgba(0, 212, 255, 0.06)', offset: 2 },
        { y: 0.75, length: 0.010, amplitude: 35, speed: 0.018, color: 'rgba(255, 60, 172, 0.05)', offset: 4 },
        { y: 0.55, length: 0.005, amplitude: 50, speed: 0.010, color: 'rgba(108, 63, 255, 0.04)', offset: 6 },
        { y: 0.80, length: 0.012, amplitude: 25, speed: 0.020, color: 'rgba(0, 212, 255, 0.04)', offset: 1 },
    ];

    let waveTime = 0;

    function drawWaves() {
        wCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);

        // Background gradient
        const bgGrad = wCtx.createRadialGradient(
            waveCanvas.width * 0.3, waveCanvas.height * 0.3, 0,
            waveCanvas.width * 0.5, waveCanvas.height * 0.5, waveCanvas.width * 0.8
        );
        bgGrad.addColorStop(0, 'rgba(108, 63, 255, 0.03)');
        bgGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
        bgGrad.addColorStop(1, 'rgba(0, 212, 255, 0.02)');
        wCtx.fillStyle = bgGrad;
        wCtx.fillRect(0, 0, waveCanvas.width, waveCanvas.height);

        waves.forEach(wave => {
            wCtx.beginPath();
            wCtx.moveTo(0, waveCanvas.height);

            for (let x = 0; x <= waveCanvas.width; x += 2) {
                const y = waveCanvas.height * wave.y +
                    Math.sin(x * wave.length + waveTime * wave.speed + wave.offset) * wave.amplitude +
                    Math.sin(x * wave.length * 0.5 + waveTime * wave.speed * 0.8 + wave.offset * 1.5) * wave.amplitude * 0.5;
                wCtx.lineTo(x, y);
            }

            wCtx.lineTo(waveCanvas.width, waveCanvas.height);
            wCtx.closePath();
            wCtx.fillStyle = wave.color;
            wCtx.fill();
        });

        waveTime += 1;
        requestAnimationFrame(drawWaves);
    }

    drawWaves();

    // ============================================
    // Particle Canvas Animation
    // ============================================
    const particleCanvas = document.getElementById('particleCanvas');
    const pCtx = particleCanvas.getContext('2d');

    function resizeParticleCanvas() {
        particleCanvas.width = window.innerWidth;
        particleCanvas.height = window.innerHeight;
    }
    resizeParticleCanvas();

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * particleCanvas.width;
            this.y = Math.random() * particleCanvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.speedY = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random() * 0.5 + 0.1;
            this.opacitySpeed = (Math.random() - 0.5) * 0.005;
            this.hue = Math.random() > 0.5 ? 260 : 190; // purple or cyan
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.opacity += this.opacitySpeed;

            if (this.opacity <= 0.05 || this.opacity >= 0.6) {
                this.opacitySpeed *= -1;
            }

            if (this.x < -10 || this.x > particleCanvas.width + 10 ||
                this.y < -10 || this.y > particleCanvas.height + 10) {
                this.reset();
            }
        }

        draw() {
            pCtx.beginPath();
            pCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            pCtx.fillStyle = `hsla(${this.hue}, 80%, 65%, ${this.opacity})`;
            pCtx.fill();
        }
    }

    const particleCount = Math.min(80, Math.floor(window.innerWidth / 20));
    const particles = Array.from({ length: particleCount }, () => new Particle());

    function drawParticles() {
        pCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

        particles.forEach(p => {
            p.update();
            p.draw();
        });

        // Draw connection lines between close particles
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 120) {
                    pCtx.beginPath();
                    pCtx.moveTo(particles[i].x, particles[i].y);
                    pCtx.lineTo(particles[j].x, particles[j].y);
                    pCtx.strokeStyle = `rgba(108, 63, 255, ${0.06 * (1 - dist / 120)})`;
                    pCtx.lineWidth = 0.5;
                    pCtx.stroke();
                }
            }
        }

        requestAnimationFrame(drawParticles);
    }

    drawParticles();

    // Handle resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            resizeWaveCanvas();
            resizeParticleCanvas();
        }, 150);
    });

    // ============================================
    // Navbar Scroll Effect
    // ============================================
    const navbar = document.getElementById('navbar');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // ============================================
    // Mobile Navigation Toggle
    // ============================================
    const mobileToggle = document.getElementById('mobileToggle');
    const navLinks = document.querySelector('.nav-links');

    mobileToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        mobileToggle.classList.toggle('active');
    });

    // Close mobile menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            mobileToggle.classList.remove('active');
        });
    });

    // ============================================
    // Scroll Animations (Intersection Observer)
    // ============================================
    const animatedElements = document.querySelectorAll('[data-animate]');

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.getAttribute('data-delay') || 0;
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, parseInt(delay));
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animatedElements.forEach(el => observer.observe(el));

    // ============================================
    // Counter Animation
    // ============================================
    const counters = document.querySelectorAll('[data-count]');

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.getAttribute('data-count'));
                const duration = 2000;
                const startTime = performance.now();

                function updateCounter(currentTime) {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);

                    // Ease out cubic
                    const eased = 1 - Math.pow(1 - progress, 3);
                    const current = Math.round(eased * target);

                    el.textContent = current.toLocaleString();

                    if (progress < 1) {
                        requestAnimationFrame(updateCounter);
                    }
                }

                requestAnimationFrame(updateCounter);
                counterObserver.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => counterObserver.observe(counter));

    // ============================================
    // Smooth Scroll for Anchor Links
    // ============================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const offsetTop = targetElement.getBoundingClientRect().top + window.pageYOffset - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ============================================
    // Contact Form Handler
    // ============================================
    const contactForm = document.getElementById('contactForm');

    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const btn = this.querySelector('button[type="submit"]');
        const originalHTML = btn.innerHTML;

        btn.innerHTML = '<span>Sending...</span>';
        btn.disabled = true;
        btn.style.opacity = '0.7';

        // Simulated send
        setTimeout(() => {
            btn.innerHTML = '<span>✓ Message Sent!</span>';
            btn.style.background = 'linear-gradient(135deg, #28c840 0%, #00d4ff 100%)';

            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.background = '';
                contactForm.reset();
            }, 3000);
        }, 1500);
    });

    // ============================================
    // Magnetic Effect on Service Cards (Desktop)
    // ============================================
    if (window.innerWidth > 768) {
        document.querySelectorAll('.service-card').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const glow = card.querySelector('.card-glow');
                if (glow) {
                    glow.style.left = `${x - rect.width}px`;
                    glow.style.top = `${y - rect.height}px`;
                    glow.style.opacity = '1';
                }
            });

            card.addEventListener('mouseleave', () => {
                const glow = card.querySelector('.card-glow');
                if (glow) {
                    glow.style.opacity = '0';
                }
            });
        });
    }

})();
