/**
 * MMO Smart Icon & Brand Resolver Engine
 * Tự động lọc từ khóa trong tên sản phẩm (ví dụ: "Credit API - API Codex Plus" -> "codex" -> Apple App Store Icon)
 * Gọi API iTunes chính hãng của Apple để lấy Icon 512x512 chuẩn Squircle của Apple.
 */

(function (global) {
  const window = global;
  // Bộ nhớ đệm Icon trong LocalStorage để hiển thị 0ms cho các lần sau
  const CACHE_KEY = 'mmo_apple_icon_cache_v2';
  let memoryCache = {};
  try {
    if (typeof localStorage !== 'undefined') {
      memoryCache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    }
  } catch (e) {
    memoryCache = {};
  }

  // Danh mục từ khóa thực thể nổi tiếng -> Từ khóa tối ưu để gọi Apple iTunes Search API
  const ENTITY_PATTERNS = [
    // AI & Dev Tools
    { match: /\b(codex|openai codex|api codex)\b/i, term: 'chatgpt', fallback: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/42/3b/1d/423b1d61-1b55-0bca-d3b9-1ce597c7b4b0/AppIcon-0-0-1x_U007epad-0-0-0-1-0-85-220.png/512x512bb.jpg' },
    { match: /\b(chatgpt|gpt-?4|openai|dall-?e|sora)\b/i, term: 'chatgpt', fallback: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/42/3b/1d/423b1d61-1b55-0bca-d3b9-1ce597c7b4b0/AppIcon-0-0-1x_U007epad-0-0-0-1-0-85-220.png/512x512bb.jpg' },
    { match: /\b(claude|anthropic|sonnet|opus|haiku)\b/i, term: 'claude', fallback: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/eb/00/7c/eb007c0a-a26e-eb3e-9f89-cb1c37049237/AppIcon-0-0-1x_U007epad-0-1-85-220.png/512x512bb.jpg' },
    { match: /\b(midjourney|mid journey)\b/i, term: 'midjourney', fallback: 'https://www.chototmmo.com/assets/storage/images/iconO43A.png' },
    { match: /\b(cursor|cursor ai)\b/i, term: 'cursor', fallback: 'https://img.icons8.com/fluency/96/code.png' },
    { match: /\b(copilot|github copilot)\b/i, term: 'github copilot', fallback: 'https://img.icons8.com/fluency/96/github.png' },
    { match: /\b(perplexity|perplexity ai)\b/i, term: 'perplexity', fallback: 'https://img.icons8.com/fluency/96/search.png' },
    { match: /\b(gemini|google gemini|bard)\b/i, term: 'google gemini', fallback: 'https://img.icons8.com/fluency/96/google-logo.png' },
    { match: /\b(deepseek|deep seek)\b/i, term: 'deepseek', fallback: 'https://img.icons8.com/fluency/96/whale.png' },
    { match: /\b(suno|suno ai)\b/i, term: 'suno', fallback: 'https://img.icons8.com/fluency/96/musical-notes.png' },
    { match: /\b(elevenlabs|eleven labs)\b/i, term: 'elevenlabs', fallback: 'https://img.icons8.com/fluency/96/microphone.png' },
    { match: /\b(poe|poe ai)\b/i, term: 'poe', fallback: 'https://img.icons8.com/fluency/96/chat.png' },

    // Video, Photo & Productivity
    { match: /\b(capcut|cap cut)\b/i, term: 'capcut', fallback: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/fb/53/9e/fb539e09-8f98-9b9e-0d13-c19c2373ff2b/AppIcon-0-0-1x_U007emarketing-0-8-0-85-220.png/512x512bb.jpg' },
    { match: /\b(canva|canva pro)\b/i, term: 'canva', fallback: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/54/f2/7b/54f27b60-a3a3-62bc-8bc7-2cf1ce516731/AppIcon-0-0-1x_U007epad-0-11-0-85-220.png/512x512bb.jpg' },
    { match: /\b(photoshop|adobe photoshop)\b/i, term: 'photoshop', fallback: 'https://img.icons8.com/fluency/96/adobe-photoshop.png' },
    { match: /\b(lightroom|adobe lightroom)\b/i, term: 'lightroom', fallback: 'https://img.icons8.com/fluency/96/adobe-lightroom.png' },
    { match: /\b(figma)\b/i, term: 'figma', fallback: 'https://img.icons8.com/fluency/96/figma.png' },
    { match: /\b(notion)\b/i, term: 'notion', fallback: 'https://img.icons8.com/fluency/96/notion.png' },
    { match: /\b(office 365|microsoft 365|word|excel)\b/i, term: 'microsoft 365', fallback: 'https://img.icons8.com/fluency/96/microsoft-office-2019.png' },

    // Social, Chat & Community
    { match: /\b(telegram|tele|tele star|tele premium)\b/i, term: 'telegram', fallback: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/49/45/33/49453346-cd15-c622-d6eb-5f4f99ca82fa/Telegram-0-0-1x_U007epad-0-1-0-85-220.png/512x512bb.jpg' },
    { match: /\b(tiktok|tik tok)\b/i, term: 'tiktok', fallback: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/99/33/74/99337468-d03a-5efc-d436-67c0f4d918e1/TikTok_AppIcon26-0-0-1x_U007epad-0-1-0-85-220.png/512x512bb.jpg' },
    { match: /\b(twitter|x\.com| x |x blue|x premium)\b/i, term: 'twitter', fallback: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/7e/15/28/7e152864-460b-8d69-2f21-72fc7ee08518/AppIcon-0-0-1x_U007epad-0-1-85-220.png/512x512bb.jpg' },
    { match: /\b(discord|discord nitro)\b/i, term: 'discord', fallback: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/f9/3f/31/f93f310e-890e-e076-7184-a4fa123e4f90/AppIcon-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.jpg' },
    { match: /\b(facebook|fb ads|meta)\b/i, term: 'facebook', fallback: 'https://img.icons8.com/fluency/96/facebook-new.png' },
    { match: /\b(instagram|insta)\b/i, term: 'instagram', fallback: 'https://img.icons8.com/fluency/96/instagram-new.png' },
    { match: /\b(youtube|yt premium)\b/i, term: 'youtube', fallback: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/11/1f/1e/111f1e29-ab13-355b-4ed2-b1b97abc2200/logo_youtube_2024_q4_color-0-0-1x_U007emarketing-0-0-0-7-0-0-0-85-220.png/512x512bb.jpg' },
    { match: /\b(netflix)\b/i, term: 'netflix', fallback: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/17/ac/4e/17ac4efb-a0a4-e618-c58b-79a2fa4b544d/AppIcon-0-0-1x_U007epad-0-1-0-sRGB-0-85-220.png/512x512bb.jpg' },
    { match: /\b(spotify)\b/i, term: 'spotify', fallback: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/8b/f2/6a/8bf26ab9-3ced-cb5c-a2b3-19f65e7f5cc6/AppIcon-0-0-1x_U007epad-0-1-0-0-85-220.png/512x512bb.jpg' },
    { match: /\b(duolingo)\b/i, term: 'duolingo', fallback: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/4f/4c/0f/4f4c0f9e-fddc-960e-5ea1-10d2b099c16f/AppIcon-0-0-1x_U007epad-0-1-85-220.png/512x512bb.jpg' },

    // Gaming & Stores
    { match: /\b(the isle)\b/i, term: 'the isle', fallback: 'https://img.icons8.com/fluency/96/dinosaur.png' },
    { match: /\b(steam|steam wallet)\b/i, term: 'steam', fallback: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/1d/e1/8d/1de18df0-9f13-4bdb-728a-ddc7ecaf9849/AppIcon-0-0-1x_U007emarketing-0-8-0-85-220.png/512x512bb.jpg' },
    { match: /\b(roblox)\b/i, term: 'roblox', fallback: 'https://img.icons8.com/fluency/96/roblox.png' },
    { match: /\b(minecraft)\b/i, term: 'minecraft', fallback: 'https://img.icons8.com/fluency/96/minecraft-logo.png' },
    { match: /\b(garena|liên quân|lien quan)\b/i, term: 'garena', fallback: 'https://img.icons8.com/fluency/96/controller.png' },

    // VPN & Network
    { match: /\b(nordvpn|nord vpn)\b/i, term: 'nordvpn', fallback: 'https://img.icons8.com/fluency/96/vpn.png' },
    { match: /\b(expressvpn|express vpn)\b/i, term: 'expressvpn', fallback: 'https://img.icons8.com/fluency/96/vpn.png' },
    { match: /\b(surfshark)\b/i, term: 'surfshark', fallback: 'https://img.icons8.com/fluency/96/vpn.png' },
    { match: /\b(1\.1\.1\.1|warp\+|warp plus|cloudflare)\b/i, term: '1.1.1.1', fallback: 'https://img.icons8.com/fluency/96/cloudflare.png' },
    { match: /\b(gmail|google workspace|google one)\b/i, term: 'gmail', fallback: 'https://img.icons8.com/fluency/96/gmail.png' },
    { match: /\b(outlook|hotmail)\b/i, term: 'microsoft outlook', fallback: 'https://img.icons8.com/fluency/96/microsoft-outlook-2019.png' }
  ];

  // Từ điển loại bỏ từ thừa trong tên sản phẩm
  const NOISE_WORDS_REGEX = /(tài khoản|tai khoan|acc|tk|key|bản quyền|ban quyen|chính chủ|chinh chu|vĩnh viễn|vinh vien|1 tháng|1 thang|1 năm|1 nam|12 tháng|12 thang|pro|plus|ultra|vip|slot|share|private|full thông tin|full tt|credit|giá rẻ|gia re|mua|bán|store|shop|online)/gi;

  /**
   * Trích xuất từ khóa tìm kiếm app từ tên sản phẩm và danh mục
   * @param {string} title Tên sản phẩm (ví dụ: "Credit API - API Codex Plus 120$ Credit")
   * @param {string} cat Danh mục
   * @returns {{term: string, fallback: string}}
   */
  function extractAppKeyword(title, cat) {
    const fullText = `${title || ''} ${cat || ''}`.trim();

    // 1. Kiểm tra các mẫu từ khóa nổi tiếng
    for (const item of ENTITY_PATTERNS) {
      if (item.match.test(fullText)) {
        return { term: item.term, fallback: item.fallback };
      }
    }

    // 2. Làm sạch từ rác để lấy tên app chính
    let cleaned = fullText.replace(NOISE_WORDS_REGEX, ' ').replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
    const words = cleaned.split(/\s+/).filter(w => w.length > 1 && !/^\d+$/.test(w));

    if (words.length > 0) {
      const detectedTerm = words.slice(0, 2).join(' ');
      return { term: detectedTerm, fallback: 'https://www.chototmmo.com/assets/storage/images/iconBS4R.png' };
    }

    return { term: (cat || 'app').toLowerCase(), fallback: 'https://www.chototmmo.com/assets/storage/images/iconBS4R.png' };
  }

  /**
   * Gọi Apple iTunes Search API để lấy Icon chính hãng
   * @param {string} term 
   * @returns {Promise<string|null>}
   */
  async function fetchAppleIconUrl(term) {
    if (!term) return null;
    const cleanTerm = term.toLowerCase().trim();

    // Kiểm tra cache trước
    if (memoryCache[cleanTerm]) {
      return memoryCache[cleanTerm];
    }

    try {
      const endpoint = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanTerm)}&entity=software&limit=1`;
      const res = await fetch(endpoint);
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.results && data.results.length > 0) {
        const item = data.results[0];
        const iconUrl = item.artworkUrl512 || item.artworkUrl100 || item.artworkUrl60;
        if (iconUrl) {
          memoryCache[cleanTerm] = iconUrl;
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
          } catch (e) {}
          return iconUrl;
        }
      }
    } catch (err) {
      // Bỏ qua lỗi mạng, sẽ dùng icon dự phòng
    }
    return null;
  }

  // Cache thông tin chi tiết App Store (Screenshots, Developer, Version, Ratings)
  const DETAILS_CACHE_KEY = 'mmo_apple_details_cache_v2';
  let memoryDetailsCache = {};
  try {
    if (typeof localStorage !== 'undefined') {
      memoryDetailsCache = JSON.parse(localStorage.getItem(DETAILS_CACHE_KEY) || '{}');
    }
  } catch (e) {
    memoryDetailsCache = {};
  }

  /**
   * Gọi Apple iTunes API lấy toàn bộ thông tin App Store (Screenshots, Developer, Ratings, Version)
   * @param {string} term
   * @returns {Promise<Object|null>}
   */
  async function fetchAppleDetails(term) {
    if (!term) return null;
    const cleanTerm = term.toLowerCase().trim();

    if (memoryDetailsCache[cleanTerm]) {
      return memoryDetailsCache[cleanTerm];
    }

    try {
      const endpoint = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanTerm)}&entity=software&limit=1`;
      const res = await fetch(endpoint);
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.results && data.results.length > 0) {
        const item = data.results[0];
        const iconUrl = item.artworkUrl512 || item.artworkUrl100 || item.artworkUrl60;
        const details = {
          name: item.trackName || '',
          developer: item.artistName || item.sellerName || 'IPAVIET Studio',
          icon: iconUrl || '',
          screenshots: Array.isArray(item.screenshotUrls) ? item.screenshotUrls : [],
          genres: Array.isArray(item.genres) ? item.genres.join(' • ') : (item.primaryGenreName || 'Dịch vụ số'),
          version: item.version || 'Mới nhất',
          releaseNotes: item.releaseNotes || 'Cập nhật bản mới nhất tối ưu độ ổn định và bàn giao tự động.',
          rating: item.averageUserRating ? item.averageUserRating.toFixed(1) : '5.0',
          ratingCount: item.userRatingCount ? (item.userRatingCount > 1000000 ? (item.userRatingCount / 1000000).toFixed(1) + ' Tr' : (item.userRatingCount > 1000 ? Math.round(item.userRatingCount / 1000) + 'K' : item.userRatingCount)) : 'Xác thực',
          description: item.description || ''
        };

        if (iconUrl) {
          memoryCache[cleanTerm] = iconUrl;
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache)); } catch (e) {}
        }

        memoryDetailsCache[cleanTerm] = details;
        try {
          localStorage.setItem(DETAILS_CACHE_KEY, JSON.stringify(memoryDetailsCache));
        } catch (e) {}

        return details;
      }
    } catch (err) {}
    return null;
  }

  /**
   * Giải mã toàn bộ chi tiết App Store cho 1 sản phẩm
   * @param {Object} product
   * @returns {Promise<Object>}
   */
  async function resolveFullDetails(product) {
    if (!product) return null;
    const { term, fallback } = extractAppKeyword(product.name, product.cat);
    const appleData = await fetchAppleDetails(term);
    return {
      term,
      fallback,
      ...(appleData || {})
    };
  }

  /**
   * Hàm chính: Gán Icon thông minh cho thẻ ảnh hoặc phần tử sản phẩm
   * @param {Object} product Đối tượng sản phẩm ({ id, name, cat, icon })
   * @param {HTMLImageElement} imgElement Phần tử <img> cần gán ảnh
   */
  function attachSmartAppIcon(product, imgElement) {
    if (!product || !imgElement) return;

    // Nếu admin đã cấu hình icon rõ ràng và không phải icon mẫu BS4R
    if (product.icon && !product.icon.includes('iconBS4R.png') && product.icon.startsWith('http')) {
      imgElement.src = product.icon;
      return;
    }

    const { term, fallback } = extractAppKeyword(product.name, product.cat);
    const cleanTerm = term.toLowerCase().trim();

    // Nếu đã có trong cache
    if (memoryCache[cleanTerm]) {
      imgElement.src = memoryCache[cleanTerm];
      return;
    }

    // Gán fallback tức thì để không bị trống ảnh
    imgElement.src = fallback;

    // Bắt đầu gọi Apple iTunes Search API ngầm
    fetchAppleIconUrl(cleanTerm).then(appleIcon => {
      if (appleIcon && imgElement) {
        imgElement.src = appleIcon;
      }
    });
  }

  /**
   * Lấy URL Icon đồng bộ (hoặc từ cache nếu có)
   * @param {Object} product 
   * @returns {string}
   */
  function getProductIconSync(product) {
    if (product && product.icon && !product.icon.includes('iconBS4R.png') && product.icon.startsWith('http')) {
      return product.icon;
    }
    const { term, fallback } = extractAppKeyword(product ? product.name : '', product ? product.cat : '');
    const cleanTerm = term.toLowerCase().trim();
    if (memoryCache[cleanTerm]) {
      return memoryCache[cleanTerm];
    }
    return fallback;
  }

  // Export ra toàn cục
  const exported = {
    extractAppKeyword,
    fetchAppleIconUrl,
    fetchAppleDetails,
    resolveFullDetails,
    attachSmartAppIcon,
    getProductIconSync
  };

  if (typeof window !== 'undefined') window.MmoIconResolver = exported;
  if (typeof global !== 'undefined') global.MmoIconResolver = exported;
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;

})(typeof window !== 'undefined' ? window : globalThis);

