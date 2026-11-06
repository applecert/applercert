import os
import re
import html

def build_showcase():
    print("Building lucian-showcase.html with 42 official Lucian UX/UI pre-made components + 52 Motion Animations...")
    
    # Read existing 52 animations section from lucian-showcase.html
    with open('lucian-showcase.html', 'r', encoding='utf-8') as f:
        existing = f.read()

    m_matrix = re.search(r'(<!-- ═+\s*52 ANIMATION MATRIX GALLERY.*?)(<!-- ═+\s*LUCIAN 36\+ COMPONENTS SECTION|<\/main>)', existing, re.DOTALL)
    if not m_matrix:
        raise Exception("Could not find 52 animation matrix section in lucian-showcase.html")
    matrix_html = m_matrix.group(1).strip()

    # Read all 42 pre-made components
    comp_files = sorted([f for f in os.listdir('lucian-components') if f.endswith('.html')])
    print(f"Found {len(comp_files)} official pre-made components.")

    category_slugs = {
        'Buttons': 'cat-btn',
        'Toggles & Pickers': 'cat-tog',
        'Inputs & Search': 'cat-inp',
        'Menus & Tabs': 'cat-men',
        'Cards & Content': 'cat-crd',
        'Alerts & Feedback': 'cat-alt',
        'Loading & Progress': 'cat-lod',
        'Promos & Rewards': 'cat-prm'
    }

    cards_html = []
    
    for f in comp_files:
        path = os.path.join('lucian-components', f)
        with open(path, 'r', encoding='utf-8') as fp:
            raw_content = fp.read()

        cid = f.replace('.html', '')
        m_title = re.search(r'Element:\s*(.*)', raw_content)
        m_cat = re.search(r'Category:\s*([^·\n]*)', raw_content)
        m_tags = re.search(r'Tags:\s*([^·\n]*)', raw_content)
        m_does = re.search(r'What it does:\s*([^\n]*)', raw_content)
        m_how = re.search(r'How to use it:\s*([^\n]*)', raw_content)

        title = m_title.group(1).strip() if m_title else f'Element #{cid}'
        cat = m_cat.group(1).strip() if m_cat else 'General'
        tags_str = m_tags.group(1).strip() if m_tags else ''
        tags = [t.strip() for t in tags_str.split(',') if t.strip()]
        does = m_does.group(1).strip() if m_does else ''
        how = m_how.group(1).strip() if m_how else ''
        cat_slug = category_slugs.get(cat, 'cat-other')

        # Clean snippet for live embedding: keep only the style, div, script
        # The license comment is kept as well per MIT license requirement
        # Escape code for the code modal/accordion
        escaped_code = html.escape(raw_content)

        tag_pills = "".join([f'<span class="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700/60 font-mono">#{t}</span>' for t in tags[:4]])

        card = f'''
        <!-- Official Pre-made Element #{cid}: {title} -->
        <div class="official-card {cat_slug} bg-slate-900/70 border border-slate-800 hover:border-sky-500/40 rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between" data-cid="{cid}" data-cat="{cat_slug}" data-tags="{tags_str}">
          <div>
            <!-- Card Header -->
            <div class="flex items-start justify-between gap-3 mb-3">
              <div>
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                  <span class="px-2.5 py-0.5 rounded-md font-mono text-xs font-black bg-sky-500/20 text-sky-400 border border-sky-500/30">#{cid}</span>
                  <span class="text-xs font-bold text-slate-300">{cat}</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Code Sẵn Official
                  </span>
                </div>
                <h3 class="text-base font-extrabold text-white tracking-tight">{title}</h3>
              </div>
              <a href="https://lucianlabs.dev/uxui-prompt/#{cid}" target="_blank" rel="noopener" class="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition" title="Xem trên Lucian Labs">
                <i data-lucide="external-link" class="w-4 h-4"></i>
              </a>
            </div>

            <!-- Description -->
            <p class="text-xs text-slate-400 leading-relaxed mb-4">{does}</p>
            {f'<div class="text-[11px] text-sky-300/80 mb-3 flex items-center gap-1"><i data-lucide="mouse-pointer" class="w-3 h-3 flex-none"></i> <span>{how}</span></div>' if how else ''}
          </div>

          <!-- Official Live Element Stage -->
          <div class="lucian-stage my-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-center p-4 min-h-[220px] overflow-hidden relative">
            {raw_content}
          </div>

          <!-- Card Footer & Code Action -->
          <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-2">
            <div class="flex items-center gap-1.5 flex-wrap">
              {tag_pills}
            </div>
            <button onclick="toggleCodeModal('{cid}')" class="px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition flex items-center gap-1.5 border border-slate-700">
              <i data-lucide="code" class="w-3.5 h-3.5 text-sky-400"></i>
              <span>Lấy Code Sẵn</span>
            </button>
          </div>

          <!-- Hidden Raw Code Storage -->
          <textarea id="rawCode_{cid}" class="hidden">{escaped_code}</textarea>
        </div>
        '''
        cards_html.append(card)

    all_cards_str = "\n".join(cards_html)

    # Full HTML Template
    template = f'''<!DOCTYPE html>
<html lang="vi" data-theme="dark" class="scroll-smooth antialiased">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Lucian UX/UI Hub — 42+ Components Code Sẵn & 52+ Animations | IPAVIET</title>
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet">
  
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"></script>

  <!-- Lucian Official Tokens CSS -->
  <link rel="stylesheet" href="lucian-tokens.css">

  <!-- Lucian Motion Core CSS -->
  <link rel="stylesheet" href="lucian-motion.css?v=2">

  <style>
    :root {{
      --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }}
    body {{
      font-family: var(--font-sans);
      background-color: var(--ux-page, #0b0f19);
      color: var(--ux-ink, #f1f5f9);
      transition: background-color 0.3s ease, color 0.3s ease;
    }}
    .apple-glass {{
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }}
    html[data-theme="light"] .apple-glass {{
      background: rgba(255, 255, 255, 0.85);
      border-color: rgba(0, 0, 0, 0.08);
    }}
    .motion-card {{
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 20px;
      transition: all 0.3s cubic-bezier(0.34, 1.45, 0.64, 1);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 240px;
    }}
    .motion-card:hover {{
      border-color: rgba(14, 165, 233, 0.4);
      transform: translateY(-3px);
      box-shadow: 0 16px 36px -12px rgba(14, 165, 233, 0.2);
    }}
    .badge-code {{
      font-family: var(--font-mono);
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #38bdf8;
    }}
    .tab-btn.active {{
      background: #0ea5e9;
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4);
    }}
    .lucian-stage {{
      max-width: 100%;
    }}
    /* Ensure elements inside stages scale nicely */
    .lucian-stage > .ux {{
      max-width: 100%;
    }}
  </style>
</head>
<body class="min-h-screen pb-24 selection:bg-sky-500/30 selection:text-sky-200">

  <!-- Header & Top Navigation -->
  <header class="sticky top-0 z-50 apple-glass border-b border-slate-800/80">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-500 flex items-center justify-center font-black text-white shadow-lg shadow-sky-500/25">
          <i data-lucide="layers" class="w-5 h-5"></i>
        </div>
        <div>
          <span class="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">LUCIAN UX/UI HUB</span>
          <span class="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Official Pre-Made Code</span>
        </div>
      </div>

      <div class="flex items-center gap-2.5">
        <!-- Theme Toggle Button -->
        <button onclick="toggleTheme()" class="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white transition flex items-center gap-1.5 border border-slate-700" title="Chuyển chế độ Sáng / Tối">
          <i data-lucide="sun" class="w-3.5 h-3.5 text-amber-400 hidden dark-icon"></i>
          <i data-lucide="moon" class="w-3.5 h-3.5 text-sky-400 light-icon"></i>
          <span id="themeLabelText" class="text-[11px]">Dark</span>
        </button>

        <a href="index.html" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5">
          <i data-lucide="home" class="w-3.5 h-3.5"></i>
          <span class="hidden sm:inline">Trang chủ</span>
        </a>
        <a href="ipavip.html" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5">
          <i data-lucide="crown" class="w-3.5 h-3.5 text-amber-400"></i>
          <span class="hidden sm:inline">Kho VIP</span>
        </a>
        <a href="certapple/checkout.html" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white transition flex items-center gap-1.5 border border-sky-500/30">
          <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
          <span>Mua Cert</span>
        </a>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-6 text-center">
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-slate-300 mb-5">
      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      Tích Hợp Toàn Bộ Code Sẵn Từ Thư Viện Lucian UX/UI CLI (42+ Elements)
    </div>
    
    <h1 class="text-3xl sm:text-5xl font-black tracking-tight mb-4 text-white">
      Kho <span class="bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Code Sẵn Lucian UX/UI</span> & Motion
    </h1>
    <p class="max-w-2xl mx-auto text-sm sm:text-base text-slate-400 leading-relaxed mb-6">
      Sử dụng 100% mã nguồn làm sẵn trích xuất trực tiếp từ bộ cài Lucian CLI: đầy đủ Style Scoped, Markup Accessible, Script tương tác và Theme Tokens chuẩn.
    </p>

    <!-- Main View Switcher Tabs -->
    <div class="flex items-center justify-center gap-3 mb-8">
      <button id="viewTabOfficial" onclick="switchMainView('official')" class="px-5 py-2.5 rounded-xl font-bold text-sm bg-sky-500 text-white shadow-lg shadow-sky-500/30 transition flex items-center gap-2">
        <i data-lucide="code-2" class="w-4 h-4"></i>
        <span>42 Thành Phần Code Sẵn Chuẩn (Official)</span>
      </button>
      <button id="viewTabMotion" onclick="switchMainView('motion')" class="px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-2">
        <i data-lucide="sparkles" class="w-4 h-4 text-amber-400"></i>
        <span>52 Lucian Motion Animations (A01-A52)</span>
      </button>
    </div>

    <!-- Official Elements Filter Bar -->
    <div id="officialFilterSection" class="max-w-5xl mx-auto">
      <!-- Search input -->
      <div class="relative max-w-md mx-auto mb-5">
        <i data-lucide="search" class="w-4 h-4 absolute left-3.5 top-3 text-slate-400"></i>
        <input type="text" id="componentSearchInput" oninput="filterOfficialSearch(this.value)" placeholder="Tìm kiếm component (#001, button, toggle, rating, modal...)" class="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-500 transition">
      </div>

      <!-- Category Filter Pills -->
      <div class="flex items-center justify-center gap-2 flex-wrap" id="officialCatTabs">
        <button onclick="filterOfficialCat('all', this)" class="official-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-500 text-white transition">Tất Cả (42)</button>
        <button onclick="filterOfficialCat('cat-btn', this)" class="official-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800/80 text-slate-300 hover:text-white transition">Buttons (12)</button>
        <button onclick="filterOfficialCat('cat-tog', this)" class="official-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800/80 text-slate-300 hover:text-white transition">Toggles & Pickers (8)</button>
        <button onclick="filterOfficialCat('cat-inp', this)" class="official-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800/80 text-slate-300 hover:text-white transition">Inputs & Search (5)</button>
        <button onclick="filterOfficialCat('cat-men', this)" class="official-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800/80 text-slate-300 hover:text-white transition">Menus & Tabs (5)</button>
        <button onclick="filterOfficialCat('cat-crd', this)" class="official-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800/80 text-slate-300 hover:text-white transition">Cards & Content (4)</button>
        <button onclick="filterOfficialCat('cat-alt', this)" class="official-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800/80 text-slate-300 hover:text-white transition">Alerts & Feedback (2)</button>
        <button onclick="filterOfficialCat('cat-lod', this)" class="official-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800/80 text-slate-300 hover:text-white transition">Loading & Progress (2)</button>
        <button onclick="filterOfficialCat('cat-prm', this)" class="official-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800/80 text-slate-300 hover:text-white transition">Promos & Rewards (4)</button>
      </div>
    </div>
  </section>

  <!-- ═══════════════════════════════════════════════════════════════
       VIEW 1: 42 OFFICIAL PRE-MADE COMPONENTS GALLERY
       ═══════════════════════════════════════════════════════════════ -->
  <main id="officialComponentsContainer" class="max-w-7xl mx-auto px-4 sm:px-6">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="officialComponentsGrid">
      {all_cards_str}
    </div>
  </main>

  <!-- ═══════════════════════════════════════════════════════════════
       VIEW 2: 52 ANIMATION MATRIX GALLERY (A01 - A52)
       ═══════════════════════════════════════════════════════════════ -->
  <div id="motionAnimationsContainer" class="hidden">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 mb-6 text-center">
      <div class="flex items-center justify-center gap-2 flex-wrap max-w-5xl mx-auto" id="filterTabs">
        <button onclick="filterCategory('all', this)" class="tab-btn active px-3.5 py-1.5 rounded-xl text-xs font-bold transition">Tất Cả (52 Animations)</button>
        <button onclick="filterCategory('cat1', this)" class="tab-btn px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800/60 text-slate-300 hover:text-white transition">Nút & Micro (A01-A10)</button>
        <button onclick="filterCategory('cat2', this)" class="tab-btn px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800/60 text-slate-300 hover:text-white transition">Thẻ 3D & Không Gian (A11-A20)</button>
        <button onclick="filterCategory('cat3', this)" class="tab-btn px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800/60 text-slate-300 hover:text-white transition">Tiến Trình & Loader (A21-A28)</button>
        <button onclick="filterCategory('cat4', this)" class="tab-btn px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800/60 text-slate-300 hover:text-white transition">Typography & Số (A29-A36)</button>
        <button onclick="filterCategory('cat5', this)" class="tab-btn px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800/60 text-slate-300 hover:text-white transition">Gamification & Thưởng (A37-A44)</button>
        <button onclick="filterCategory('cat6', this)" class="tab-btn px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800/60 text-slate-300 hover:text-white transition">Điều Hướng & Cử Chỉ (A45-A52)</button>
      </div>
    </div>

    {matrix_html}
  </div>

  <!-- ═══════════════════════════════════════════════════════════════
       MODAL: CODE SNIPPET VIEWER
       ═══════════════════════════════════════════════════════════════ -->
  <div id="codeModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
      <!-- Modal Header -->
      <div class="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded font-mono text-xs font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30" id="modalSnippetId">#001</span>
          <h3 class="text-sm font-bold text-white" id="modalSnippetTitle">Mã Nguồn Làm Sẵn (HTML + CSS + JS)</h3>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="copySnippetFromModal()" id="btnModalCopy" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white transition flex items-center gap-1.5 shadow">
            <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            <span>Sao Chép Code</span>
          </button>
          <button onclick="closeCodeModal()" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>
      </div>
      <!-- Modal Body -->
      <div class="p-4 overflow-y-auto flex-1 font-mono text-xs bg-slate-950 text-slate-300">
        <pre><code id="modalCodeText" class="language-html"></code></pre>
      </div>
    </div>
  </div>

  <!-- Lucian Motion Core JS -->
  <script src="lucian-motion.js?v=2"></script>

  <script>
    // Initialize Lucide Icons
    document.addEventListener('DOMContentLoaded', () => {{
      lucide.createIcons();
      initDemoScratchCanvas();
      initDemoDragBox();
    }});

    // Switch between 42 Official Components & 52 Motion Animations
    function switchMainView(view) {{
      const tabOfficial = document.getElementById('viewTabOfficial');
      const tabMotion = document.getElementById('viewTabMotion');
      const containerOfficial = document.getElementById('officialComponentsContainer');
      const containerMotion = document.getElementById('motionAnimationsContainer');
      const filterOfficial = document.getElementById('officialFilterSection');

      if (view === 'official') {{
        tabOfficial.className = 'px-5 py-2.5 rounded-xl font-bold text-sm bg-sky-500 text-white shadow-lg shadow-sky-500/30 transition flex items-center gap-2';
        tabMotion.className = 'px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-2';
        containerOfficial.classList.remove('hidden');
        filterOfficial.classList.remove('hidden');
        containerMotion.classList.add('hidden');
      }} else {{
        tabMotion.className = 'px-5 py-2.5 rounded-xl font-bold text-sm bg-sky-500 text-white shadow-lg shadow-sky-500/30 transition flex items-center gap-2';
        tabOfficial.className = 'px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-2';
        containerOfficial.classList.add('hidden');
        filterOfficial.classList.add('hidden');
        containerMotion.classList.remove('hidden');
      }}
      lucide.createIcons();
    }}

    // Filter Official Components by Category
    function filterOfficialCat(cat, btn) {{
      document.querySelectorAll('#officialCatTabs .official-tab-btn').forEach(b => {{
        b.className = 'official-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800/80 text-slate-300 hover:text-white transition';
      }});
      btn.className = 'official-tab-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-500 text-white transition';

      const cards = document.querySelectorAll('#officialComponentsGrid .official-card');
      cards.forEach(card => {{
        if (cat === 'all' || card.getAttribute('data-cat') === cat) {{
          card.style.display = 'flex';
        }} else {{
          card.style.display = 'none';
        }}
      }});
    }}

    // Filter Official Components by Search
    function filterOfficialSearch(val) {{
      const query = val.toLowerCase().trim();
      const cards = document.querySelectorAll('#officialComponentsGrid .official-card');
      cards.forEach(card => {{
        const text = card.textContent.toLowerCase();
        const tags = (card.getAttribute('data-tags') || '').toLowerCase();
        const cid = card.getAttribute('data-cid') || '';
        if (!query || text.includes(query) || tags.includes(query) || cid.includes(query)) {{
          card.style.display = 'flex';
        }} else {{
          card.style.display = 'none';
        }}
      }});
    }}

    // Toggle Dark / Light Theme
    function toggleTheme() {{
      const html = document.documentElement;
      const cur = html.getAttribute('data-theme') || 'dark';
      const next = cur === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      const lbl = document.getElementById('themeLabelText');
      if (lbl) lbl.textContent = next === 'dark' ? 'Dark' : 'Light';
      
      const darkIcon = document.querySelector('.dark-icon');
      const lightIcon = document.querySelector('.light-icon');
      if (next === 'dark') {{
        darkIcon?.classList.add('hidden');
        lightIcon?.classList.remove('hidden');
      }} else {{
        darkIcon?.classList.remove('hidden');
        lightIcon?.classList.add('hidden');
      }}
    }}

    // Code Modal
    let activeModalCid = '';
    function toggleCodeModal(cid) {{
      activeModalCid = cid;
      const textarea = document.getElementById('rawCode_' + cid);
      if (!textarea) return;
      document.getElementById('modalSnippetId').textContent = '#' + cid;
      document.getElementById('modalCodeText').textContent = textarea.value;
      const modal = document.getElementById('codeModal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }}

    function closeCodeModal() {{
      const modal = document.getElementById('codeModal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }}

    function copySnippetFromModal() {{
      const text = document.getElementById('modalCodeText').textContent;
      navigator.clipboard.writeText(text).then(() => {{
        const btn = document.getElementById('btnModalCopy');
        const orig = btn.innerHTML;
        btn.innerHTML = '<span>✓ Đã sao chép!</span>';
        setTimeout(() => btn.innerHTML = orig, 1800);
      }});
    }}

    // Filter Categories for 52 Animations
    function filterCategory(cat, btn) {{
      document.querySelectorAll('#filterTabs button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const cards = document.querySelectorAll('#animationGrid .motion-card');
      cards.forEach(c => {{
        if (cat === 'all' || c.getAttribute('data-cat') === cat) {{
          c.style.display = 'flex';
        }} else {{
          c.style.display = 'none';
        }}
      }});
    }}

    // Password strength meter gauge demo
    function updatePassGauge(val) {{
      const b1 = document.getElementById('pBar1');
      const b2 = document.getElementById('pBar2');
      const b3 = document.getElementById('pBar3');
      const b4 = document.getElementById('pBar4');
      const lbl = document.getElementById('pBarLabel');
      if (!b1 || !b2 || !b3 || !b4) return;
      [b1, b2, b3, b4].forEach(b => {{ b.style.backgroundColor = 'rgba(255,255,255,0.1)'; b.classList.remove('is-active'); }});

      let score = 0;
      if (val.length >= 4) score++;
      if (val.length >= 8 && /[0-9]/.test(val)) score++;
      if (val.length >= 10 && /[A-Z]/.test(val)) score++;
      if (val.length >= 12 && /[^a-zA-Z0-9]/.test(val)) score++;

      const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
      const texts = ['Nhập để kiểm tra', 'Yếu', 'Trung bình', 'Khá', 'Cực kỳ mạnh mẽ'];

      if (score >= 1) {{ b1.style.backgroundColor = colors[score - 1]; b1.classList.add('is-active'); }}
      if (score >= 2) {{ b2.style.backgroundColor = colors[score - 1]; b2.classList.add('is-active'); }}
      if (score >= 3) {{ b3.style.backgroundColor = colors[score - 1]; b3.classList.add('is-active'); }}
      if (score >= 4) {{ b4.style.backgroundColor = colors[score - 1]; b4.classList.add('is-active'); }}
      if (lbl) lbl.textContent = texts[score];
    }}

    // Demo Scratch Canvas
    function initDemoScratchCanvas() {{
      const cvs = document.getElementById('demoScratchCanvas');
      if (!cvs) return;
      const ctx = cvs.getContext('2d');
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, 0, cvs.width, cvs.height);
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CÀO TẠI ĐÂY 🪙', cvs.width / 2, cvs.height / 2 + 4);

      let isDrawing = false;
      function scratch(e) {{
        if (!isDrawing) return;
        const rect = cvs.getBoundingClientRect();
        const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
        const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fill();
      }}

      cvs.addEventListener('mousedown', () => isDrawing = true);
      cvs.addEventListener('touchstart', () => isDrawing = true, {{ passive: true }});
      window.addEventListener('mouseup', () => isDrawing = false);
      window.addEventListener('touchend', () => isDrawing = false);
      cvs.addEventListener('mousemove', scratch);
      cvs.addEventListener('touchmove', scratch, {{ passive: true }});
    }}

    // Demo Drag Box
    function initDemoDragBox() {{
      const box = document.getElementById('demoDragBox');
      if (!box) return;
      let isDragging = false;
      let startX = 0;
      let startY = 0;

      const onStart = (e) => {{
        isDragging = true;
        startX = (e.clientX || (e.touches && e.touches[0].clientX));
        startY = (e.clientY || (e.touches && e.touches[0].clientY));
        box.classList.add('is-dragging');
      }};

      const onMove = (e) => {{
        if (!isDragging) return;
        const curX = (e.clientX || (e.touches && e.touches[0].clientX));
        const curY = (e.clientY || (e.touches && e.touches[0].clientY));
        const dx = (curX - startX) * 0.6;
        const dy = (curY - startY) * 0.6;
        box.style.transform = `translate(${{dx}}px, ${{dy}}px)`;
      }};

      const onEnd = () => {{
        if (!isDragging) return;
        isDragging = false;
        box.classList.remove('is-dragging');
        box.style.transform = 'translate(0, 0)';
      }};

      box.addEventListener('mousedown', onStart);
      box.addEventListener('touchstart', onStart, {{ passive: true }});
      window.addEventListener('mousemove', onMove);
      window.addEventListener('touchmove', onMove, {{ passive: true }});
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchend', onEnd);
    }}

    // Hold Button confirmation trigger
    const holdBtn = document.getElementById('btnHoldDemo');
    if (holdBtn) {{
      holdBtn.addEventListener('holdConfirm', () => {{
        const st = document.getElementById('holdStatusText');
        if (st) st.textContent = '✅ Đã xác nhận thành công!';
        if (window.LucianMotion) LucianMotion.showToast('Xác nhận thao tác giữ chuột thành công!', 'success');
      }});
    }}
  </script>
</body>
</html>
'''

    with open('lucian-showcase.html', 'w', encoding='utf-8') as out:
        out.write(template)

    print("Successfully built lucian-showcase.html!")

if __name__ == '__main__':
    build_showcase()
