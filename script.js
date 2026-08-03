document.addEventListener("DOMContentLoaded", () => {
    // حارس أمان: يمنع تنفيذ كل هذا الكود أكثر من مرة على نفس الصفحة لأي سبب
    if (document.documentElement.dataset.siteJsInit) return;
    document.documentElement.dataset.siteJsInit = 'true';

    // 1. الوضع الليلي والنهاري (Dark/Light Mode)
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    // مساعدات مشتركة للمفضلة (تُستخدم من الصفحة الرئيسية وصفحة المقال نفسها)
    function getFavorites() {
        try { return JSON.parse(localStorage.getItem('favoriteArticles') || '[]'); }
        catch (e) { return []; }
    }
    function isFavorited(url) { return getFavorites().indexOf(url) !== -1; }
    function toggleFavorite(url) {
        let favs = getFavorites();
        if (favs.indexOf(url) !== -1) favs = favs.filter(u => u !== url);
        else favs.push(url);
        localStorage.setItem('favoriteArticles', JSON.stringify(favs));
        return favs.indexOf(url) !== -1;
    }

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
            if (chartData.options.plugins.title) {
                chartData.options.plugins.title.color = textColor;
                chartData.options.plugins.title.font = { family: 'Tajawal', size: 16, weight: 'bold' };
            }

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
            if (chart.options.plugins.title && chart.options.plugins.title.color) {
                chart.options.plugins.title.color = newTextColor;
            }
            if (chart.options.scales) {
                if (chart.options.scales.x) { chart.options.scales.x.ticks.color = newTextColor; chart.options.scales.x.grid.color = newGridColor; }
                if (chart.options.scales.y) { chart.options.scales.y.ticks.color = newTextColor; chart.options.scales.y.grid.color = newGridColor; }
            }
            chart.update();
        });
    }

    // 4. أزرار "نسخ" فوق مربعات الأكواد البرمجية (تُضاف بعد إزالة كتل المخططات أعلاه، فلا تتكرر عليها)
    // هذا الكود لا يعتمد على وجود class معيّن (مثل highlighter-rouge) بل يستهدف أي <pre>
    // داخل المقالة مباشرة، حتى يشتغل بغض النظر عن نسخة Jekyll/Rouge المستخدمة.
    document.querySelectorAll('.post-content pre').forEach(pre => {
        if (pre.dataset.copyReady) return; // تجنّب التكرار
        // حماية إضافية: لا تضف زر نسخ إطلاقاً لأي كتلة مخطط بياني (حتى لو لم تُحوَّل لأي سبب)
        if (pre.closest('.language-chart') || pre.closest('.chart-wrapper')) return;
        pre.dataset.copyReady = 'true';

        const codeEl = pre.querySelector('code') || pre;

        // نضمن وجود حاوية بموضع relative لا تتأثر بتمرير الكود الأفقي، حتى لو
        // لم يكن هناك غلاف div.highlighter-rouge أصلاً حول الـ pre
        let container = pre.parentElement;
        if (!container || container.classList.contains('post-content')) {
            const wrap = document.createElement('div');
            wrap.className = 'code-wrap';
            pre.replaceWith(wrap);
            wrap.appendChild(pre);
            container = wrap;
        }
        container.style.position = 'relative';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'copy-code-btn';
        btn.textContent = 'نسخ';
        btn.setAttribute('aria-label', 'نسخ الكود');

        btn.addEventListener('click', () => {
            const text = codeEl.textContent;
            const onSuccess = () => {
                btn.textContent = 'تم النسخ ✓';
                btn.classList.add('is-copied');
                setTimeout(() => {
                    btn.textContent = 'نسخ';
                    btn.classList.remove('is-copied');
                }, 1600);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(onSuccess).catch(() => { btn.textContent = 'تعذّر النسخ'; });
            } else {
                // بديل احتياطي للمتصفحات القديمة التي لا تدعم Clipboard API
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                try { document.execCommand('copy'); onSuccess(); } catch (e) { btn.textContent = 'تعذّر النسخ'; }
                document.body.removeChild(ta);
            }
        });

        container.appendChild(btn);
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

    // 6. البحث والتصفية حسب التصنيف + المفضلة (الصفحة الرئيسية فقط)
    const grid = document.getElementById('articles-grid');
    if (grid) {
        const cards = Array.from(grid.querySelectorAll('.article-card'));
        const searchInput = document.getElementById('article-search');
        const pillsContainer = document.getElementById('category-pills');
        const favToggle = document.getElementById('favorites-toggle');
        const noResultsMsg = document.getElementById('no-results-msg');
        let activeCategory = 'all';
        let showFavoritesOnly = false;

        function applyFilters() {
            const query = (searchInput ? searchInput.value.trim().toLowerCase() : '');
            let visibleCount = 0;
            cards.forEach(card => {
                const title = (card.dataset.title || '').toLowerCase();
                const categories = (card.dataset.categories || '').split(',').map(c => c.trim()).filter(Boolean);
                const url = card.dataset.url;
                const matchesSearch = !query || title.indexOf(query) !== -1;
                const matchesCategory = activeCategory === 'all' || categories.indexOf(activeCategory) !== -1;
                const matchesFavorite = !showFavoritesOnly || isFavorited(url);
                const visible = matchesSearch && matchesCategory && matchesFavorite;
                card.style.display = visible ? '' : 'none';
                if (visible) visibleCount++;
            });
            if (noResultsMsg) noResultsMsg.style.display = visibleCount === 0 ? 'block' : 'none';
        }

        // تهيئة أزرار المفضلة على كل بطاقة
        grid.querySelectorAll('.favorite-btn').forEach(btn => {
            const url = btn.dataset.url;
            if (isFavorited(url)) {
                btn.classList.add('is-favorited');
                btn.textContent = '★';
                btn.setAttribute('aria-pressed', 'true');
            }
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const nowFav = toggleFavorite(url);
                btn.classList.toggle('is-favorited', nowFav);
                btn.textContent = nowFav ? '★' : '☆';
                btn.setAttribute('aria-pressed', String(nowFav));
                if (showFavoritesOnly) applyFilters();
            });
        });

        if (searchInput) searchInput.addEventListener('input', applyFilters);

        if (pillsContainer) {
            pillsContainer.querySelectorAll('.pill').forEach(pill => {
                pill.addEventListener('click', () => {
                    pillsContainer.querySelectorAll('.pill').forEach(p => p.classList.remove('is-active'));
                    pill.classList.add('is-active');
                    activeCategory = pill.dataset.category;
                    applyFilters();
                });
            });
        }

        if (favToggle) {
            favToggle.addEventListener('click', () => {
                showFavoritesOnly = !showFavoritesOnly;
                favToggle.classList.toggle('is-active', showFavoritesOnly);
                const icon = favToggle.querySelector('.star-icon');
                if (icon) icon.textContent = showFavoritesOnly ? '★' : '☆';
                applyFilters();
            });
        }

        applyFilters();
    }

    // 7. زر "أضف للمفضلة" داخل صفحة المقال نفسها (وليس فقط من بطاقته بالرئيسية)
    const favPostBtn = document.getElementById('favorite-post-btn');
    if (favPostBtn) {
        const url = favPostBtn.dataset.url;
        const starEl = favPostBtn.querySelector('.star');
        const labelEl = favPostBtn.querySelector('.label');
        function renderFavState(fav) {
            favPostBtn.classList.toggle('is-favorited', fav);
            favPostBtn.setAttribute('aria-pressed', String(fav));
            if (starEl) starEl.textContent = fav ? '★' : '☆';
            if (labelEl) labelEl.textContent = fav ? 'في المفضلة' : 'أضف للمفضلة';
        }
        renderFavState(isFavorited(url));
        favPostBtn.addEventListener('click', () => {
            renderFavState(toggleFavorite(url));
        });
    }

    // 8. جدول محتويات تلقائي — يُبنى من عناوين H2 داخل أي مقال طويل (3 عناوين فأكثر)
    const postContent = document.querySelector('.post-content');
    if (postContent) {
        const headings = postContent.querySelectorAll('h2');
        if (headings.length >= 3) {
            const tocBox = document.createElement('div');
            tocBox.className = 'post-toc';
            const tocTitle = document.createElement('h4');
            tocTitle.textContent = 'محتويات المقال';
            const tocList = document.createElement('ol');
            headings.forEach((h, i) => {
                if (!h.id) h.id = 'section-' + (i + 1);
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = '#' + h.id;
                a.textContent = h.textContent;
                li.appendChild(a);
                tocList.appendChild(li);
            });
            tocBox.appendChild(tocTitle);
            tocBox.appendChild(tocList);
            const h1 = postContent.querySelector('h1');
            if (h1 && h1.parentNode) {
                h1.parentNode.insertBefore(tocBox, h1.nextSibling);
            } else {
                postContent.insertBefore(tocBox, postContent.firstChild);
            }
        }
    }
});
