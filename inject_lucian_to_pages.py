import os
import re

def update_ipavip():
    print("Updating ipavip.html with Lucian #052 and #386...")
    with open('ipavip.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # Load 052
    with open('lucian-components/052.html', 'r', encoding='utf-8') as f:
        c52 = f.read()
    style52 = c52[c52.find('<style>'):c52.find('</style>')+8]
    div52 = c52[c52.find('<div class="ux u052">'):c52.find('</div>\n<script>')+6]
    script52 = c52[c52.find('<script>'):c52.rfind('</script>')+9]

    div52 = div52.replace('Lumen</span>', 'IPAVIET</span>')
    div52 = div52.replace('KIM SEOYEON', 'HOI VIEN VIP')
    div52 = div52.replace('5241 •••• •••• 0818', '•••• •••• •••• 8899')
    div52 = div52.replace('09/29', 'VĨNH VIỄN')
    div52 = div52.replace('Show back', 'Lật Mặt Sau')
    div52 = div52.replace('Lock card', 'Khóa Thẻ')
    div52 = div52.replace('<span><b>2.5%</b>Cashback</span>', '<span><b>App Hack</b>Full Unlock</span>')
    div52 = div52.replace('<span><b>Free</b>Lounge</span>', '<span><b>1 Đổi 1</b>Bảo Hành Cert</span>')
    div52 = div52.replace('<span><b>12,480</b>Points</span>', '<span><b>24/7</b>Hỗ Trợ Ưu Tiên</span>')

    script52 = script52.replace("flipB.lastChild.textContent = back ? 'Show front' : 'Show back';", "flipB.lastChild.textContent = back ? 'Mặt Trước' : 'Mặt Sau';")
    script52 = script52.replace("lk.lastChild.textContent = on ? 'Unlock' : 'Lock card';", "lk.lastChild.textContent = on ? 'Mở Khóa' : 'Khóa Thẻ';")

    # Load 386
    with open('lucian-components/386.html', 'r', encoding='utf-8') as f:
        c386 = f.read()
    style386 = c386[c386.find('<style>'):c386.find('</style>')+8]
    div386 = c386[c386.find('<div class="ux u386">'):c386.find('</div>\n<script>')+6]
    script386 = c386[c386.find('<script>'):c386.rfind('</script>')+9]

    div386 = div386.replace('Badges', 'Huân Chương VIP')
    div386 = div386.replace('Unlock', 'Nhận Huy Hiệu')

    script386 = script386.replace(
        "var BD = [['First step', 'Signed in for the first time'], ['Steady', 'Visited 7 days in a row'], ['Chatterbox', 'Left 50 comments'], ['Explorer', 'Visited every menu'], ['Helper', '10 accepted answers'], ['Legend', 'Reached level 30']];",
        "var BD = [['Khởi đầu', 'Đăng nhập vào hệ thống'], ['Bền bỉ', 'Điểm danh 7 ngày liên tiếp'], ['Cộng đồng', 'Tải hơn 20 ứng dụng VIP'], ['Khám phá', 'Trải nghiệm kho ứng dụng'], ['Đánh giá', 'Đánh giá 5 sao ứng dụng'], ['Huyền thoại', 'Sở hữu Cert Apple VIP']];"
    )
    script386 = script386.replace("b.querySelector('.u386-k small').textContent = 'Earned ' + DATE[i];", "b.querySelector('.u386-k small').textContent = 'Đạt ngày ' + DATE[i];")
    script386 = script386.replace("num.textContent = unlocked + '/6 ' + ' earned';", "num.textContent = unlocked + '/6 đã đạt';")

    vip_showcase_block = f'''
    <!-- ═══ OFFICIAL LUCIAN UX/UI: VIP MEMBERSHIP & REWARDS ═══ -->
    <div class="rounded-3xl p-5 sm:p-7 border border-amber-500/25 bg-gradient-to-br from-slate-900/90 via-slate-950/90 to-amber-950/20 shadow-2xl backdrop-blur-xl my-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-white/10">
        <div>
          <span class="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
            ✦ Lucian UX/UI Experience
          </span>
          <h2 class="text-lg sm:text-xl font-black text-white mt-1">Đặc Quyền Hội Viên & Huân Chương VIP</h2>
        </div>
        <p class="text-xs text-slate-400 max-w-md">Kéo để xoay thẻ 3D trong không gian hoặc nhấn để mở khóa các mốc thành tựu VIP.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center justify-items-center">
        <!-- Lucian #052: Flip-around membership card -->
        <div class="flex flex-col items-center">
          <div class="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5 font-mono">
            <span class="text-sky-400">[#052]</span> THẺ THÀNH VIÊN 3D HOLOGRAPHIC
          </div>
          {style52}
          {div52}
          {script52}
        </div>

        <!-- Lucian #386: Glowing unlockable badges -->
        <div class="flex flex-col items-center">
          <div class="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5 font-mono">
            <span class="text-amber-400">[#386]</span> BẢNG HUÂN CHƯƠNG ĐẶC QUYỀN
          </div>
          {style386}
          {div386}
          {script386}
        </div>
      </div>
    </div>
    '''

    target = '<div id="categoryShelf" style="display:none;"><div id="categoryPillsContainer"></div><span id="totalProductCounter">0</span></div>'
    if target in content and 'OFFICIAL LUCIAN UX/UI: VIP MEMBERSHIP' not in content:
        content = content.replace(target, target + '\n' + vip_showcase_block)
        with open('ipavip.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print("✓ Successfully injected #052 and #386 into ipavip.html!")
    else:
        print("Note: Target not found or already injected in ipavip.html")

def update_index():
    print("Updating index.html with Lucian #001, #008, #014...")
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # Load 001
    with open('lucian-components/001.html', 'r', encoding='utf-8') as f:
        c1 = f.read()
    style1 = c1[c1.find('<style>'):c1.find('</style>')+8]
    div1 = c1[c1.find('<div class="ux u001"'):c1.find('</div>\n<script>')+6]
    script1 = c1[c1.find('<script>'):c1.rfind('</script>')+9]
    div1 = div1.replace('Continue', 'Kích Hoạt Ngay')
    div1 = div1.replace('Saved', 'Đã Kích Hoạt')
    script1 = script1.replace("'Saving'", "'Đang Kích Hoạt'")
    script1 = script1.replace("'Saved'", "'Đã Kích Hoạt'")

    # Load 008
    with open('lucian-components/008.html', 'r', encoding='utf-8') as f:
        c8 = f.read()
    style8 = c8[c8.find('<style>'):c8.find('</style>')+8]
    div8 = c8[c8.find('<div class="ux u008">'):c8.find('</div>\n<script>')+6]
    script8 = c8[c8.find('<script>'):c8.rfind('</script>')+9]
    div8 = div8.replace('npm i', 'curl -s')
    div8 = div8.replace('pnpm add', 'vsign sign')
    div8 = div8.replace('bun add', 'dns set')
    div8 = div8.replace('<b>@lucian/motion</b>', '<b>https://ipaviet.site/vsign</b>')

    # Load 014
    with open('lucian-components/014.html', 'r', encoding='utf-8') as f:
        c14 = f.read()
    style14 = c14[c14.find('<style>'):c14.find('</style>')+8]
    div14 = c14[c14.find('<div class="ux u014">'):c14.find('</div>\n<script>')+6]
    script14 = c14[c14.find('<script>'):c14.rfind('</script>')+9]
    
    # Replace tasks in 014 with IPAVIET tasks
    div14 = div14.replace('Finish onboarding flow', 'Kiểm tra UDID thiết bị iOS')
    div14 = div14.replace('Update brand tokens in Figma', 'Ký chứng chỉ Doanh Nghiệp Apple')
    div14 = div14.replace('Review quarterly launch plan', 'Cài đặt VSign & Anti-Revoke')
    div14 = div14.replace('Order standing desk converter', 'Bảo hành 1 đổi 1 suốt 365 ngày')
    div14 = div14.replace('3 of 4 done', '3 / 4 bước hoàn thành')

    index_showcase_section = f'''
<!-- ═══ OFFICIAL LUCIAN UX/UI INTERACTIVE SHOWCASE SECTION ═══ -->
<section class="lucian-official-section" style="padding: 70px 20px; background: rgba(15, 23, 42, 0.4); border-top: 1px solid rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.06);">
  <div class="container" style="max-width: 1200px; margin: 0 auto; text-align: center;">
    <div style="display: inline-flex; align-items: center; gap: 8px; padding: 4px 14px; border-radius: 999px; background: rgba(14, 165, 233, 0.15); border: 1px solid rgba(14, 165, 233, 0.3); color: #38bdf8; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 14px;">
      <span style="width: 6px; height: 6px; border-radius: 50%; background: #38bdf8;"></span> Lucian UX/UI Standard
    </div>
    <h2 style="font-size: clamp(24px, 4vw, 38px); font-weight: 900; color: #fff; margin-bottom: 10px; letter-spacing: -0.02em;">
      Trải Nghiệm Tương Tác Cảm Ứng Chuẩn Quốc Tế
    </h2>
    <p style="font-size: 14px; color: var(--text-secondary); max-width: 600px; margin: 0 auto 40px; line-height: 1.6;">
      Tích hợp trực tiếp các thành phần tương tác cao cấp từ Lucian UX/UI: từ viên thuốc thủy tinh lỏng, sao chép lệnh một chạm có vệt quét, đến danh sách công việc thời gian thực.
    </p>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; justify-items: center; align-items: center;">
      <!-- [001] Liquid Glass Button -->
      <div style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 360px;">
        <span style="font-size: 11px; font-weight: 700; color: #38bdf8; font-family: monospace; margin-bottom: 8px;">[#001] LIQUID GLASS BUTTON</span>
        {style1}
        {div1}
        {script1}
      </div>

      <!-- [008] Copy Command Box -->
      <div style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 360px;">
        <span style="font-size: 11px; font-weight: 700; color: #10b981; font-family: monospace; margin-bottom: 8px;">[#008] COPY COMMAND & CHECK</span>
        {style8}
        {div8}
        {script8}
      </div>

      <!-- [014] To-do Checklist -->
      <div style="display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 360px;">
        <span style="font-size: 11px; font-weight: 700; color: #f59e0b; font-family: monospace; margin-bottom: 8px;">[#014] WORKFLOW CHECKLIST</span>
        {style14}
        {div14}
        {script14}
      </div>
    </div>
  </div>
</section>
'''

    target = '<section class="cta-section" id="cta">'
    if target in content and 'OFFICIAL LUCIAN UX/UI INTERACTIVE SHOWCASE' not in content:
        content = content.replace(target, index_showcase_section + '\n' + target)
        with open('index.html', 'w', encoding='utf-8') as f:
            f.write(content)
        print("✓ Successfully injected #001, #008, #014 into index.html!")
    else:
        print("Note: Target not found or already injected in index.html")

if __name__ == '__main__':
    update_ipavip()
    update_index()
