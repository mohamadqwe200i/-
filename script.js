document.addEventListener("DOMContentLoaded", () => {
    // 1. الوضع الليلي والنهاري (Dark/Light Mode)
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    // تحقّق دفاعي: لو الزر غير موجود لأي سبب، نتجنب توقف باقي السكربت بالكامل
    if (themeToggle) {
        // التحقق من الوضع المحفوظ للمستخدم
        if (localStorage.getItem('theme') === 'dark') {
            body.classList.add('dark-mode');
            themeToggle.textContent = '☀️';
        } else {
            themeToggle.textContent = '🌙';
        }

        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            if (body.classList.contains('dark-mode')) {
                localStorage.setItem('theme', 'dark');
                themeToggle.textContent = '☀️';
            } else {
                localStorage.setItem('theme', 'light');
                themeToggle.textContent = '🌙';
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
            const canvas = document.createElement('canvas');
            canvas.id = 'chart-' + index;

            // إصلاح: نستبدل صندوق النص نفسه فقط، وليس عنصره الأب بالكامل
            // (استبدال الأب كان يمسح باقي محتوى المقالة بالخطأ)
            block.replaceWith(canvas);

            const textColor = getComputedStyle(body).getPropertyValue('--text-primary').trim() || '#2d3436';
            Chart.defaults.color = textColor;

            // إعدادات المخطط للخط العربي والتجاوب
            chartData.options = chartData.options || {};
            chartData.options.responsive = true;
            chartData.options.plugins = chartData.options.plugins || {};
            chartData.options.plugins.legend = { labels: { color: textColor, font: { family: 'Tajawal' } } };

            const newChart = new Chart(canvas, chartData);
            charts.push(newChart);
        } catch (e) {
            console.error('يوجد خطأ في قراءة بيانات المخطط البياني (JSON)', e);
        }
    });

    // دالة لتحديث ألوان المخططات عند التبديل للوضع الليلي
    function updateChartColors() {
        const newTextColor = getComputedStyle(body).getPropertyValue('--text-primary').trim() || '#2d3436';
        Chart.defaults.color = newTextColor;
        charts.forEach(chart => {
            if (chart.options.plugins.legend.labels) {
                chart.options.plugins.legend.labels.color = newTextColor;
            }
            if (chart.options.scales) {
                if (chart.options.scales.x) chart.options.scales.x.ticks.color = newTextColor;
                if (chart.options.scales.y) chart.options.scales.y.ticks.color = newTextColor;
            }
            chart.update();
        });
    }
});