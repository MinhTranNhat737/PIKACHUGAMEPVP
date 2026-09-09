export interface UserAccount {
  id: string
  username: string
  passwordHash: string
  displayName: string
  coins: number
  botLevel: number // 1 to 50
  botStars?: Record<number, number> // Map level -> 1, 2, or 3 stars
  botLevelProgress?: number
  unlockedItems: string[]
  equipped: {
    boardTheme: string
    boardFrame: string
    tileStyle: string
    lineEffect: string
  }
  characterId?: string
  rankPoints?: number // Điểm xếp hạng PVP Elo (Mặc định: 500)
  rankWins?: number // Tổng số trận thắng rank
  rankLosses?: number // Tổng số trận thua rank
  createdAt: number
  lastLogin: number
  role?: 'user' | 'admin'
}

export interface ShopItem {
  id: string
  category: 'theme' | 'frame' | 'tile' | 'line'
  cssClass: string
  name: string
  price: number
  description: string
  previewColor: string
}

export const SHOP_CATALOG: Record<'theme' | 'frame' | 'tile' | 'line', ShopItem[]> = {
  theme: [
    {
      id: 'theme-emerald',
      category: 'theme',
      cssClass: 'theme-emerald',
      name: 'Ngọc Lục Bảo Classic',
      price: 0,
      description: 'Phong cách retro xanh ngọc cổ điển dịu mắt',
      previewColor: 'linear-gradient(135deg, #0d3427, #062319)',
    },
    {
      id: 'theme-cyberpunk',
      category: 'theme',
      cssClass: 'theme-cyberpunk',
      name: 'Cyberpunk Dạ Quang',
      price: 250,
      description: 'Ánh tím neon công nghệ tương lai hiện đại',
      previewColor: 'linear-gradient(135deg, #240b36, #120320)',
    },
    {
      id: 'theme-lava',
      category: 'theme',
      cssClass: 'theme-lava',
      name: 'Dung Nham Hỏa Ngục',
      price: 400,
      description: 'Hơi nóng rực cháy của nham thạch núi lửa',
      previewColor: 'linear-gradient(135deg, #450a0a, #1c0303)',
    },
    {
      id: 'theme-galaxy',
      category: 'theme',
      cssClass: 'theme-galaxy',
      name: 'Ngân Hà Tinh Vân',
      price: 600,
      description: 'Vũ trụ huyền bí lấp lánh ngàn vì sao',
      previewColor: 'linear-gradient(135deg, #0f172a, #030712)',
    },
    {
      id: 'theme-void',
      category: 'theme',
      cssClass: 'theme-void',
      name: 'Hố Đen Hư Không',
      price: 700,
      description: 'Vực sâu vô tận tím đen với xoáy sáng cực quang',
      previewColor: 'linear-gradient(135deg, #1f083d, #020006)',
    },
    {
      id: 'theme-sakura',
      category: 'theme',
      cssClass: 'theme-sakura',
      name: 'Hoa Anh Đào Tokyo',
      price: 500,
      description: 'Cánh hoa anh đào rơi lãng mạn, thanh tao',
      previewColor: 'linear-gradient(135deg, #4a152e, #15030d)',
    },
    {
      id: 'theme-thunder',
      category: 'theme',
      cssClass: 'theme-thunder',
      name: 'Bão Điện Thần Sấm',
      price: 550,
      description: 'Nền xanh sẫm với tia sét chớp lóe uy lực',
      previewColor: 'linear-gradient(135deg, #0a2558, #010612)',
    },
    {
      id: 'theme-glacier',
      category: 'theme',
      cssClass: 'theme-glacier',
      name: 'Băng Sơn Bắc Cực',
      price: 650,
      description: 'Băng tuyết phát sáng xanh ngọc lạnh buốt lộng lẫy',
      previewColor: 'linear-gradient(135deg, #083c50, #010d14)',
    },
  ],
  frame: [
    {
      id: 'frame-classic',
      category: 'frame',
      cssClass: 'frame-classic',
      name: 'Viền Ngọc Cổ Điển',
      price: 0,
      description: 'Viền kim loại ngọc bích truyền thống',
      previewColor: 'linear-gradient(135deg, #10b981, #059669)',
    },
    {
      id: 'frame-gold',
      category: 'frame',
      cssClass: 'frame-gold',
      name: 'Rồng Hoàng Kim',
      price: 300,
      description: 'Mạ vàng hoàng gia phát sáng lộng lẫy',
      previewColor: 'linear-gradient(135deg, #facc15, #ca8a04)',
    },
    {
      id: 'frame-neon',
      category: 'frame',
      cssClass: 'frame-neon',
      name: 'Sấm Sét Cyan Neon',
      price: 450,
      description: 'Tia chớp plasma phát sáng viền bàn',
      previewColor: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    },
    {
      id: 'frame-rainbow',
      category: 'frame',
      cssClass: 'frame-rainbow',
      name: 'Hào Quang Cầu Vồng RGB',
      price: 650,
      description: 'Vòng sáng chuyển sắc 7 màu sinh động',
      previewColor: 'linear-gradient(135deg, #ec4899, #8b5cf6, #3b82f6)',
    },
    {
      id: 'frame-diamond',
      category: 'frame',
      cssClass: 'frame-diamond',
      name: 'Kim Cương Thiên Hà 3D',
      price: 700,
      description: 'Viền nạm kim cương lấp lánh phản quang chói lọi',
      previewColor: 'linear-gradient(135deg, #e0f2fe, #bae6fd)',
    },
    {
      id: 'frame-dragon',
      category: 'frame',
      cssClass: 'frame-dragon',
      name: 'Hỏa Long Cuồng Nộ',
      price: 600,
      description: 'Viền lửa rồng bốc cháy rực lửa cuồng nộ',
      previewColor: 'linear-gradient(135deg, #ef4444, #f59e0b)',
    },
    {
      id: 'frame-aurora',
      category: 'frame',
      cssClass: 'frame-aurora',
      name: 'Cực Quang Cửu Sắc',
      price: 750,
      description: 'Dải cực quang phương bắc chuyển sắc liên tục',
      previewColor: 'linear-gradient(135deg, #2dd4bf, #818cf8, #f472b6)',
    },
    {
      id: 'frame-mythic',
      category: 'frame',
      cssClass: 'frame-mythic',
      name: 'Thần Thoại Cổ Đại',
      price: 800,
      description: 'Khắc ký tự rune vàng rực cổ xưa huyền thoại',
      previewColor: 'linear-gradient(135deg, #fbbf24, #d97706)',
    },
  ],
  tile: [
    {
      id: 'tile-classic',
      category: 'tile',
      cssClass: 'tile-style-classic',
      name: 'Ngà Voi 3D Cổ Điển',
      price: 0,
      description: 'Khối ngà voi nổi khối 3D truyền thống',
      previewColor: 'linear-gradient(180deg, #ffffff, #e2e8f0)',
    },
    {
      id: 'tile-crystal',
      category: 'tile',
      cssClass: 'tile-style-crystal',
      name: 'Pha Lê Trong Suốt',
      price: 350,
      description: 'Mặt kính pha lê viền lam ngọc phát sáng',
      previewColor: 'linear-gradient(135deg, rgba(56,189,248,0.4), rgba(14,165,233,0.15))',
    },
    {
      id: 'tile-golden',
      category: 'tile',
      cssClass: 'tile-style-golden',
      name: 'Thẻ Bài Kim Cương Vàng',
      price: 500,
      description: 'Nền vàng kim óng ánh quý phái',
      previewColor: 'linear-gradient(135deg, #fef08a, #ca8a04)',
    },
    {
      id: 'tile-amethyst',
      category: 'tile',
      cssClass: 'tile-style-amethyst',
      name: 'Thạch Anh Tím Tinh Thể',
      price: 600,
      description: 'Huyền bí với ánh sáng tím ngọc quyền năng',
      previewColor: 'linear-gradient(135deg, #e9d5ff, #7e22ce)',
    },
    {
      id: 'tile-jade',
      category: 'tile',
      cssClass: 'tile-style-jade',
      name: 'Ngọc Bích Phỉ Thúy',
      price: 550,
      description: 'Nền ngọc phỉ thúy bóng bẩy viền ngọc xanh ngắt',
      previewColor: 'linear-gradient(145deg, #059669, #022c22)',
    },
    {
      id: 'tile-prism',
      category: 'tile',
      cssClass: 'tile-style-prism',
      name: 'Gương Lăng Kính Tán Sắc',
      price: 700,
      description: 'Mặt kính lăng kính tán sắc 7 màu cầu vồng',
      previewColor: 'linear-gradient(135deg, rgba(255,255,255,0.3), rgba(236,72,153,0.3))',
    },
    {
      id: 'tile-imperial',
      category: 'tile',
      cssClass: 'tile-style-imperial',
      name: 'Hoàng Kim Đế Vương 3D',
      price: 800,
      description: 'Khối vàng nguyên chất đúc nổi viền vương miện',
      previewColor: 'linear-gradient(145deg, #ffd700, #b8860b)',
    },
    {
      id: 'tile-frost',
      category: 'tile',
      cssClass: 'tile-style-frost',
      name: 'Băng Thạch Cực Quang',
      price: 650,
      description: 'Ô tinh thể băng giá trong suốt viền xanh bắc cực',
      previewColor: 'linear-gradient(145deg, #0284c7, #082f49)',
    },
  ],
  line: [
    {
      id: 'line-laser',
      category: 'line',
      cssClass: 'line-gold',
      name: 'Laser Vàng Điện',
      price: 0,
      description: 'Tia laser vàng sấm sét cổ điển',
      previewColor: 'linear-gradient(90deg, #facc15, #f59e0b)',
    },
    {
      id: 'line-cyan',
      category: 'line',
      cssClass: 'line-cyan',
      name: 'Plasma Xanh Băng',
      price: 250,
      description: 'Tia plasma xanh dương lạnh buốt',
      previewColor: 'linear-gradient(90deg, #22d3ee, #0284c7)',
    },
    {
      id: 'line-flame',
      category: 'line',
      cssClass: 'line-flame',
      name: 'Hỏa Tiêu Rực Cháy',
      price: 400,
      description: 'Tia lửa đỏ cuộn trào sức mạnh',
      previewColor: 'linear-gradient(90deg, #f43f5e, #dc2626)',
    },
    {
      id: 'line-rainbow',
      category: 'line',
      cssClass: 'line-rainbow',
      name: 'Cầu Vồng Đa Sắc RGB',
      price: 600,
      description: 'Tia năng lượng dải ngân hà 7 sắc cầu vồng',
      previewColor: 'linear-gradient(90deg, #f43f5e, #eab308, #22c55e, #06b6d4, #a855f7)',
    },
    {
      id: 'line-thunder',
      category: 'line',
      cssClass: 'line-thunder',
      name: 'Tia Sấm Sét Giáng Trần',
      price: 500,
      description: 'Tia điện giật ziczac phóng quang rực lửa siêu sắc nét',
      previewColor: 'linear-gradient(90deg, #fef08a, #eab308)',
    },
    {
      id: 'line-sakura',
      category: 'line',
      cssClass: 'line-sakura',
      name: 'Dải Lụa Hoa Anh Đào',
      price: 450,
      description: 'Dải lụa phát sáng hồng thắm uốn lượn mềm mại',
      previewColor: 'linear-gradient(90deg, #fbcfe8, #f43f5e)',
    },
    {
      id: 'line-void',
      category: 'line',
      cssClass: 'line-void',
      name: 'Hư Không Huyền Bí',
      price: 700,
      description: 'Tia năng lượng tím đen huyền bí tỏa hào quang',
      previewColor: 'linear-gradient(90deg, #c084fc, #7e22ce)',
    },
    {
      id: 'line-hyper',
      category: 'line',
      cssClass: 'line-hyper',
      name: 'Siêu Laser Cầu Vồng 3D',
      price: 850,
      description: 'Tia laser 3 tầng sáng rực chuyển sắc 7 màu RGB cực mạnh',
      previewColor: 'linear-gradient(90deg, #ffffff, #06b6d4, #ec4899)',
    },
  ],
}

export const ALL_SHOP_ITEMS: ShopItem[] = [
  ...SHOP_CATALOG.theme,
  ...SHOP_CATALOG.frame,
  ...SHOP_CATALOG.tile,
  ...SHOP_CATALOG.line,
]

