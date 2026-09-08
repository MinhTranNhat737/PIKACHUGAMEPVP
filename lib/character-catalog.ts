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
  avatarType: 'satoshi' | 'madara' | 'himeko' | string
  videoSrc: string
  avatarPosition?: string
  showcasePosition?: string
  avatarScale?: number
  ultimateSkill: UltimateSkill
  ultimate: UltimateSkill
}

export const CHARACTERS: PixelCharacter[] = [
  {
    id: 'satoshi',
    name: 'Satoshi (Ash)',
    title: 'Bậc Thầy Huấn Luyện Pokémon',
    style: 'Anime Retro',
    origin: 'Pokémon',
    accentColor: '#facc15',
    glowColor: 'rgba(250, 204, 21, 0.45)',
    quoteHappy: 'Pikachu, quá đỉnh luôn! ⚡',
    quoteWin: 'Tôi đã trở thành Bậc Thầy Pokémon!',
    quoteLose: 'Không sao, Pikachu, trận sau sẽ thắng!',
    avatarType: 'satoshi',
    videoSrc: '/shatoshi.mp4',
    avatarPosition: 'center 64%',
    showcasePosition: 'center 58%',
    avatarScale: 1.05,
    ultimateSkill: {
      id: 'thunder_radar',
      name: 'Radar Sấm Sét & 10 Vạn Volt (Thunder Radar & Stun)',
      icon: '⚡',
      energyCost: 55,
      description: 'Soi sáng toàn bộ đường nối các cặp ăn được trong 10s, tặng ngay +15 Gợi ý & +3 Đổi bài, tạo 4 Hạt Nhân Sấm Sét (+50đ). PVP ĐẶC BIỆT: Phóng sét 10 Vạn Volt làm tê liệt đối thủ 3.5s, đánh sập chuỗi Combo về 0 và triệt tiêu 35% năng lượng đối thủ!',
      voiceLine: 'PIKACHU! 10 VẠN VOLT TẬP KÍCH ĐỐI THỦ!',
      bannerColor: 'linear-gradient(135deg, #facc15, #ea580c)',
    },
    ultimate: {
      id: 'thunder_radar',
      name: 'Radar Sấm Sét & 10 Vạn Volt (Thunder Radar & Stun)',
      icon: '⚡',
      energyCost: 55,
      description: 'Soi sáng toàn bộ đường nối các cặp ăn được trong 10s, tặng ngay +15 Gợi ý & +3 Đổi bài, tạo 4 Hạt Nhân Sấm Sét (+50đ). PVP ĐẶC BIỆT: Phóng sét 10 Vạn Volt làm tê liệt đối thủ 3.5s, đánh sập chuỗi Combo về 0 và triệt tiêu 35% năng lượng đối thủ!',
      voiceLine: 'PIKACHU! 10 VẠN VOLT TẬP KÍCH ĐỐI THỦ!',
      bannerColor: 'linear-gradient(135deg, #facc15, #ea580c)',
    },
  },
  {
    id: 'madara',
    name: 'Uchiha Madara',
    title: 'Huyền Thoại Gia Tộc Uchiha',
    style: 'Anime Ninja',
    origin: 'Naruto Shippuden',
    accentColor: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.45)',
    quoteHappy: 'Ngươi cũng biết múa đấy chứ!',
    quoteWin: 'Sức mạnh này... chính là của thần linh!',
    quoteLose: 'Kẻ mạnh cũng có lúc bị cản bước sao...',
    avatarType: 'madara',
    videoSrc: '/maldara.mp4',
    avatarPosition: 'center 52%',
    showcasePosition: 'center 48%',
    avatarScale: 1.05,
    ultimateSkill: {
      id: 'tsukuyomi_gravity',
      name: 'Ảo Thuật Tsukuyomi & Trọng Lực Susanoo (Gravity & Curse)',
      icon: '☄️',
      energyCost: 65,
      description: 'Ngưng đọng thời gian 8s, lực hút Susanoo dồn nén toàn bộ quân cờ xuống đáy tạo thế nối liền kề, dựng Khiên Hào Quang 15s. PVP ĐẶC BIỆT: Phong ấn Tsukuyomi khóa cờ đối thủ 4.5s & đảo tung toàn bộ vị trí cờ đối thủ!',
      voiceLine: 'HÃY CHỨNG KIẾN SỨC MẠNH CỦA THẦN LINH!',
      bannerColor: 'linear-gradient(135deg, #dc2626, #4c1d95)',
    },
    ultimate: {
      id: 'tsukuyomi_gravity',
      name: 'Ảo Thuật Tsukuyomi & Trọng Lực Susanoo (Gravity & Curse)',
      icon: '☄️',
      energyCost: 65,
      description: 'Ngưng đọng thời gian 8s, lực hút Susanoo dồn nén toàn bộ quân cờ xuống đáy tạo thế nối liền kề, dựng Khiên Hào Quang 15s. PVP ĐẶC BIỆT: Phong ấn Tsukuyomi khóa cờ đối thủ 4.5s & đảo tung toàn bộ vị trí cờ đối thủ!',
      voiceLine: 'HÃY CHỨNG KIẾN SỨC MẠNH CỦA THẦN LINH!',
      bannerColor: 'linear-gradient(135deg, #dc2626, #4c1d95)',
    },
  },
  {
    id: 'himeko',
    name: 'Himeko',
    title: 'Nhà Tiên Phong Tàu Astral Express',
    style: 'Honkai Star Rail',
    origin: 'Honkai: Star Rail',
    accentColor: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.45)',
    quoteHappy: 'Thời khắc thưởng trà thơm ngon!',
    quoteWin: 'Chuyến hành trình Astral luôn chiến thắng!',
    quoteLose: 'Đoàn tàu tạm dừng để tiếp nhiên liệu vậy...',
    avatarType: 'himeko',
    videoSrc: '/himeko.mp4',
    avatarPosition: 'center 50%',
    showcasePosition: 'center 46%',
    avatarScale: 1.05,
    ultimateSkill: {
      id: 'orbital_cross_laser',
      name: 'Laser Quỹ Đạo & Bão Lửa Thiên Thể (Orbital Flare & Drain)',
      icon: '🔥',
      energyCost: 60,
      description: 'Khai hỏa Laser Quỹ Đạo Chữ Thập phóng xuống bàn (+60đ tức thì), ban phước Bão Lửa Thái Dương Solar Overdrive x3 ĐIỂM SỐ trong 12s & cộng dồn +2s mỗi nước nối, đồng thời tạo 4 Hạt Nhân Lửa Thánh (+80đ khi ăn). PVP ĐẶC BIỆT: Thiêu đốt đối thủ gây Mù Khói Nhiệt 5s, Tê Liệt Quá Nhiệt 3.5s và trực tiếp CƯỚP 60 điểm đối thủ sang cho mình!',
      voiceLine: 'NHÂN DANH ĐOÀN TÀU ASTRAL, KHAI HỎA!',
      bannerColor: 'linear-gradient(135deg, #f97316, #b91c1c)',
    },
    ultimate: {
      id: 'orbital_cross_laser',
      name: 'Laser Quỹ Đạo & Bão Lửa Thiên Thể (Orbital Flare & Drain)',
      icon: '🔥',
      energyCost: 60,
      description: 'Khai hỏa Laser Quỹ Đạo Chữ Thập phóng xuống bàn (+60đ tức thì), ban phước Bão Lửa Thái Dương Solar Overdrive x3 ĐIỂM SỐ trong 12s & cộng dồn +2s mỗi nước nối, đồng thời tạo 4 Hạt Nhân Lửa Thánh (+80đ khi ăn). PVP ĐẶC BIỆT: Thiêu đốt đối thủ gây Mù Khói Nhiệt 5s, Tê Liệt Quá Nhiệt 3.5s và trực tiếp CƯỚP 60 điểm đối thủ sang cho mình!',
      voiceLine: 'NHÂN DANH ĐOÀN TÀU ASTRAL, KHAI HỎA!',
      bannerColor: 'linear-gradient(135deg, #f97316, #b91c1c)',
    },
  },
]

export const DEFAULT_CHARACTER_ID = 'satoshi'

export function getCharacterById(id?: string): PixelCharacter {
  if (id === 'maldara') id = 'madara'
  return CHARACTERS.find(c => c.id === id) || CHARACTERS[0]
}
