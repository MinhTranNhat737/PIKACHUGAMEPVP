export type CharacterEmotion = 'idle' | 'happy' | 'combo' | 'sad' | 'win' | 'lose'

export interface UltimateSkill {
  id: string
  name: string
  icon: string
  energyCost: number
  description: string
  voiceLine: string
  bannerColor: string
}

export interface PixelCharacter {
  id: string
  name: string
  title: string
  style: string
  origin: string
  accentColor: string
  glowColor: string
  quoteHappy: string
  quoteWin: string
  quoteLose: string
  avatarType: 'satoshi' | 'kasumi' | 'paladin' | 'mage' | 'ninja' | 'ranger' | 'cyber' | 'frost'
  ultimateSkill: UltimateSkill
  ultimate: UltimateSkill
}

export const CHARACTERS: PixelCharacter[] = [
  {
    id: 'satoshi',
    name: 'Satoshi (Ash)',
    title: 'Nhà Huấn Luyện Mũ Đỏ',
    style: 'Anime Retro Pixel',
    origin: 'OpenGameArt / Classic',
    accentColor: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    quoteHappy: 'Pikachu, quá đỉnh luôn!',
    quoteWin: 'Tôi đã trở thành Bậc Thầy Pokémon!',
    quoteLose: 'Không sao, trận sau nhất định sẽ thắng...',
    avatarType: 'satoshi',
    ultimateSkill: {
      id: 'volt_strike',
      name: 'Sấm Sét Điên Cuồng (Volt Tackle)',
      icon: '⚡',
      energyCost: 60,
      description: 'Phóng tia sét hoàng kim tự động kết nối & ăn ngay 3 cặp Pokémon bất kỳ + làm choáng đối thủ 2.5 giây!',
      voiceLine: 'PIKACHU! 10 VẠN VÔN ĐÁNH SÉT!',
      bannerColor: 'linear-gradient(135deg, #facc15, #ea580c)',
    },
  },
  {
    id: 'kasumi',
    name: 'Kasumi (Misty)',
    title: 'Nữ Huấn Luyện Năng Động',
    style: 'Anime Pixel RPG',
    origin: 'OpenGameArt / Classic',
    accentColor: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.4)',
    quoteHappy: 'Nước đi đỉnh cao chưa kìa!',
    quoteWin: 'Thủy thủ đại dương bất bại!',
    quoteLose: 'Ướt nhẹp rồi, tức ghê á...',
    avatarType: 'kasumi',
    ultimateSkill: {
      id: 'hydro_vortex',
      name: 'Đại Hồng Thủy (Hydro Vortex)',
      icon: '🌊',
      energyCost: 55,
      description: 'Cuộn sóng thần dọn sạch 2 cặp ngoài viền + giải phóng mọi debuff của mình + làm ướt trơn bảng đối thủ 3.5s!',
      voiceLine: 'SỨC MẠNH CỦA ĐẠI DƯƠNG NỔ TUNG!',
      bannerColor: 'linear-gradient(135deg, #0284c7, #06b6d4)',
    },
  },
  {
    id: 'paladin',
    name: 'Hiệp Sĩ Hoàng Gia',
    title: 'Dũng Sĩ Khiên Vàng',
    style: 'CraftPix Medieval',
    origin: 'CraftPix.net',
    accentColor: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.4)',
    quoteHappy: 'Thanh kiếm công lý tỏa sáng!',
    quoteWin: 'Vinh quang bất diệt thuộc về chúng ta!',
    quoteLose: 'Tấm khiên của ta đã vỡ tan rồi...',
    avatarType: 'paladin',
    ultimateSkill: {
      id: 'holy_aegis',
      name: 'Hào Quang Bất Hoại (Holy Aegis)',
      icon: '🛡️',
      energyCost: 50,
      description: 'Dựng khiên thánh quang miễn nhiễm mọi đòn hại trong 6s + x2 toàn bộ điểm số nhận được trong 5 nước tiếp theo!',
      voiceLine: 'VINH QUANG HOÀNG GIA CHE CHỞ TA!',
      bannerColor: 'linear-gradient(135deg, #eab308, #ca8a04)',
    },
  },
  {
    id: 'mage',
    name: 'Phù Thủy Tinh Tú',
    title: 'Bậc Thầy Ma Thuật',
    style: 'Itch.io Mystic Pixel',
    origin: 'Itch.io Assets',
    accentColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    quoteHappy: 'Phép thuật tinh tú ứng nghiệm!',
    quoteWin: 'Ngàn vì tinh tú chúc mừng đại thắng!',
    quoteLose: 'Năng lượng ma thuật đã cạn kiệt...',
    avatarType: 'mage',
    ultimateSkill: {
      id: 'astral_singularity',
      name: 'Lỗ Đen Thời Không (Astral Singularity)',
      icon: '🔮',
      energyCost: 55,
      description: 'Dịch chuyển và gom 4 cặp Pokémon về sát cạnh nhau thành chuỗi thẳng để bạn ăn Combo bốc lửa chớp nhoáng!',
      voiceLine: 'THỜI GIAN VÀ KHÔNG GIAN HÃY BIẾN ĐỔI!',
      bannerColor: 'linear-gradient(135deg, #9333ea, #c026d3)',
    },
  },
  {
    id: 'ninja',
    name: 'Ninja Bóng Đêm',
    title: 'Thích Khách Ám Vụ',
    style: 'OpenGameArt Shinobi',
    origin: 'OpenGameArt.org',
    accentColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    quoteHappy: 'Nhanh như chớp, ẩn như bóng!',
    quoteWin: 'Nhiệm vụ hoàn thành trong chớp mắt.',
    quoteLose: 'Ta đã để lộ sơ hở chí mạng...',
    avatarType: 'ninja',
    ultimateSkill: {
      id: 'shadow_shurikens',
      name: 'Phi Tiêu Hắc Ám (Shadow Shurikens)',
      icon: '🥷',
      energyCost: 50,
      description: 'Phóng 4 phi tiêu bóng tối phá hủy 2 cặp Pokémon sâu nhất + phủ bóng tối làm mù đen màn hình đối thủ trong 4.5s!',
      voiceLine: 'ÁM KHÍ BÓNG ĐÊM... VÔ ẢNH TRẢM!',
      bannerColor: 'linear-gradient(135deg, #0f172a, #334155)',
    },
  },
  {
    id: 'ranger',
    name: 'Xạ Thủ Rừng Xanh',
    title: 'Tiên Tộc Bắn Tỉa',
    style: 'CraftPix Elf Forest',
    origin: 'CraftPix.net',
    accentColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    quoteHappy: 'Mũi tên bách phát bách trúng!',
    quoteWin: 'Khu rừng thiêng đón chào người chiến thắng!',
    quoteLose: 'Cây cung của ta đã đứt dây...',
    avatarType: 'ranger',
    ultimateSkill: {
      id: 'arrow_tempest',
      name: 'Mưa Tên Thần Tốc (Arrow Tempest)',
      icon: '🏹',
      energyCost: 50,
      description: 'Bắn loạt tên thần bắn phá toàn bộ các quân cản đường + phục hồi ngay +2 Lượt Đổi Vị Trí và +1 Lượt Gợi Ý!',
      voiceLine: 'MƯA TÊN TINH LINH CÀN QUÉT!',
      bannerColor: 'linear-gradient(135deg, #10b981, #059669)',
    },
  },
  {
    id: 'cyber',
    name: 'Cyber Samurai',
    title: 'Kiếm Sĩ Neon Tương Lai',
    style: 'Itch.io Cyberpunk',
    origin: 'Itch.io Assets',
    accentColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.4)',
    quoteHappy: 'Hệ thống đã khóa mục tiêu!',
    quoteWin: 'Nâng cấp dữ liệu chiến thắng tuyệt đối!',
    quoteLose: 'Hệ thống gặp sự cố quá tải...',
    avatarType: 'cyber',
    ultimateSkill: {
      id: 'overclock_slash',
      name: 'Nhát Chém Quá Tải (Overclock Slash)',
      icon: '⚡',
      energyCost: 60,
      description: 'Cộng thêm ngay +15 giây vào đồng hồ thời gian + nhân 3 chỉ số Combo hiện tại + tăng 50% tốc độ di chuyển!',
      voiceLine: 'QUÁ TẢI 200% CÔNG SUẤT HỆ THỐNG!',
      bannerColor: 'linear-gradient(135deg, #0284c7, #6366f1)',
    },
  },
  {
    id: 'frost',
    name: 'Công Chúa Hàn Băng',
    title: 'Nữ Hoàng Băng Tuyết',
    style: 'CraftPix Fantasy',
    origin: 'CraftPix.net',
    accentColor: '#67e8f9',
    glowColor: 'rgba(103, 232, 249, 0.4)',
    quoteHappy: 'Đóng băng mọi rào cản!',
    quoteWin: 'Vương quốc băng giá cúi đầu trước nữ hoàng!',
    quoteLose: 'Lớp băng tuyết đã tan chảy mất rồi...',
    avatarType: 'frost',
    ultimateSkill: {
      id: 'absolute_zero',
      name: 'Bão Tuyết Đóng Băng (Absolute Zero)',
      icon: '❄️',
      energyCost: 65,
      description: 'Đóng băng hoàn toàn bảng đấu đối thủ trong 4.5s + đóng băng giữ nguyên đồng hồ thời gian của mình trong 6s!',
      voiceLine: 'HÀN BĂNG TUYỆT ĐỐI... ĐÓNG BĂNG VĨNH CỬU!',
      bannerColor: 'linear-gradient(135deg, #06b6d4, #38bdf8)',
    },
  },
] as PixelCharacter[]

CHARACTERS.forEach(c => {
  if (!c.ultimate) {
    c.ultimate = c.ultimateSkill
  }
})

export const DEFAULT_CHARACTER_ID = 'satoshi'

export function getCharacterById(id?: string): PixelCharacter {
  return CHARACTERS.find(c => c.id === id) || CHARACTERS[0]
}
