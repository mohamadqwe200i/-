document.addEventListener("DOMContentLoaded", () => {
    // 1. الوضع الليلي والنهاري (Dark/Light Mode)
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    // تحقّق دفاعي: لو الزر غير موجود لأي سبب، نتجنب توقف باقي السكربت بالكامل
    if (themeToggle) {
        // التحقق من الوضع المحفوظ للمستخدم
        const saved = localStorage.getItem('theme');
        if (saved === 'dark') {
            body.classList.add('dark-mode');
            themeToggle.textContent = '☀️';
        } else if (saved === 'light') {
            body.classList.add('light-mode');
            themeToggle.textContent = '🌙';
        } else {
            // لا يوجد اختيار محفوظ بعد: نترك الأمر لتفضيل النظام (يُطبَّق عبر CSS)
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            themeToggle.textContent = prefersDark ? '☀️' : '🌙';
        }

        themeToggle.addEventListener('click', () => {
            const isDarkNow = body.classList.contains('dark-mode') ||
                (!body.classList.contains('light-mode') && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
            body.classList.remove('dark-mode', 'light-mode');
            if (isDarkNow) {
                body.classList.add('light-mode');
                localStorage.setItem('theme', 'light');
                themeToggle.textContent = '🌙';
            } else {
                body.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark');
                themeToggle.textContent = '☀️';
            }
            updateChartColors(); // تحديث ألوان المخططات عند التغيير
        });
    }

    // 2. شريط تقدم القراءة
    window.addEventListener('scroll', () => {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const progressBar = document.getElementById("progress-bar");
        if (progressBar && height > 0) {
            progressBar.style.width = (winScroll / height) * 100 + "%";
        }
    });

    // 3. تحويل أكواد JSON في المقال إلى مخططات بيانية تفاعلية
    const charts = [];
    document.querySelectorAll('.language-chart').forEach((block, index) => {
        try {
            const chartData = JSON.parse(block.textContent);

            // إصلاح "شكل المخطط الغريب": نضع الرسم داخل صندوق بارتفاع ثابت
            // بدل ما نلصق canvas عاري بدون أي حاوية — هذا اللي كان يسبب تمدد/تشوّه الحجم.
            const wrapper = document.createElement('div');
            wrapper.className = 'chart-wrapper';
            const canvas = document.createElement('canvas');
            canvas.id = 'chart-' + index;
            wrapper.appendChild(canvas);

            // إصلاح سابق: نستبدل صندوق النص نفسه فقط، وليس عنصره الأب بالكامل
            block.replaceWith(wrapper);

            const textColor = getComputedStyle(body).getPropertyValue('--text-primary').trim() || '#2d3436';
            const gridColor = getComputedStyle(body).getPropertyValue('--border-color').trim() || '#dfe6e9';
            Chart.defaults.color = textColor;
            Chart.defaults.font.family = "'Tajawal', sans-serif";

            // إعدادات المخطط للخط العربي والتجاوب — maintainAspectRatio:false ضروري
            // عشان الرسم ياخذ ارتفاع الصندوق المحدد بدل نسبة عرض/ارتفاع افتراضية غريبة
            chartData.options = chartData.options || {};
            chartData.options.responsive = true;
            chartData.options.maintainAspectRatio = false;
            chartData.options.plugins = chartData.options.plugins || {};
            chartData.options.plugins.legend = chartData.options.plugins.legend || {};
            chartData.options.plugins.legend.labels = { color: textColor, font: { family: 'Tajawal' } };

            if (chartData.type !== 'pie' && chartData.type !== 'doughnut') {
                chartData.options.scales = chartData.options.scales || {};
                ['x', 'y'].forEach(axis => {
                    chartData.options.scales[axis] = chartData.options.scales[axis] || {};
                    chartData.options.scales[axis].ticks = { color: textColor };
                    chartData.options.scales[axis].grid = { color: gridColor };
                });
            }

            const newChart = new Chart(canvas, chartData);
            charts.push(newChart);
        } catch (e) {
            console.error('يوجد خطأ في قراءة بيانات المخطط البياني (JSON)', e);
        }
    });

    // دالة لتحديث ألوان المخططات عند التبديل للوضع الليلي
    function updateChartColors() {
        const newTextColor = getComputedStyle(body).getPropertyValue('--text-primary').trim() || '#2d3436';
        const newGridColor = getComputedStyle(body).getPropertyValue('--border-color').trim() || '#dfe6e9';
        Chart.defaults.color = newTextColor;
        charts.forEach(chart => {
            if (chart.options.plugins.legend.labels) {
                chart.options.plugins.legend.labels.color = newTextColor;
            }
            if (chart.options.scales) {
                if (chart.options.scales.x) { chart.options.scales.x.ticks.color = newTextColor; chart.options.scales.x.grid.color = newGridColor; }
                if (chart.options.scales.y) { chart.options.scales.y.ticks.color = newTextColor; chart.options.scales.y.grid.color = newGridColor; }
            }
            chart.update();
        });
    }

    // 4. أزرار "نسخ" فوق مربعات الأكواد البرمجية (تُضاف بعد إزالة كتل المخططات أعلاه، فلا تتكرر عليها)
    document.querySelectorAll('.post-content .highlighter-rouge').forEach(block => {
        const codeEl = block.querySelector('pre code') || block.querySelector('code');
        if (!codeEl) return;
        block.style.position = 'relative';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'copy-code-btn';
        btn.textContent = 'نسخ';
        btn.setAttribute('aria-label', 'نسخ الكود');

        btn.addEventListener('click', () => {
            navigator.clipboard.writeText(codeEl.textContent).then(() => {
                btn.textContent = 'تم النسخ ✓';
                btn.classList.add('is-copied');
                setTimeout(() => {
                    btn.textContent = 'نسخ';
                    btn.classList.remove('is-copied');
                }, 1600);
            }).catch(() => {
                btn.textContent = 'تعذّر النسخ';
            });
        });

        block.appendChild(btn);
    });

    // 5. زر "العودة للأعلى" يظهر بعد التمرير لمسافة معيّنة
    const backToTop = document.getElementById('back-to-top');
    if (backToTop) {
        window.addEventListener('scroll', () => {
            backToTop.classList.toggle('is-visible', window.scrollY > 400);
        });
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});
