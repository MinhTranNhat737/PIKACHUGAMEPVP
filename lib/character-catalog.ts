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
      name: 'Radar Sấm Sét & Ô Joker (Thunder Radar & Wildcard)',
      icon: '⚡',
      energyCost: 60,
      description: 'Bật Radar Hoàng Kim soi sáng & chỉ sẵn đường nối các cặp ăn được trong 8s, biến 4 ô bất kỳ thành Ô Sấm Sét Joker (ghép với bất kỳ Pokémon nào), cộng ngay +15 Gợi ý!',
      voiceLine: 'PIKACHU! BẬT RADAR SẤM SÉT HOÀNG KIM!',
      bannerColor: 'linear-gradient(135deg, #facc15, #ea580c)',
    },
    ultimate: {
      id: 'thunder_radar',
      name: 'Radar Sấm Sét & Ô Joker (Thunder Radar & Wildcard)',
      icon: '⚡',
      energyCost: 60,
      description: 'Bật Radar Hoàng Kim soi sáng & chỉ sẵn đường nối các cặp ăn được trong 8s, biến 4 ô bất kỳ thành Ô Sấm Sét Joker (ghép với bất kỳ Pokémon nào), cộng ngay +15 Gợi ý!',
      voiceLine: 'PIKACHU! BẬT RADAR SẤM SÉT HOÀNG KIM!',
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
      name: 'Ảo Thuật Tsukuyomi & Trọng Lực (Gravity Fall & Freeze)',
      icon: '☄️',
      energyCost: 65,
      description: 'Ngưng đọng thời gian 7s, kích hoạt lực hút Susanoo dồn nén toàn bộ quân cờ xuống đáy tạo hàng loạt thế nối liền kề, và dựng Khiên Susanoo miễn nhiễm hiệu ứng 15s (PVP: Khóa đối thủ 4s)!',
      voiceLine: 'HÃY CHỨNG KIẾN SỨC MẠNH CỦA THẦN LINH!',
      bannerColor: 'linear-gradient(135deg, #dc2626, #4c1d95)',
    },
    ultimate: {
      id: 'tsukuyomi_gravity',
      name: 'Ảo Thuật Tsukuyomi & Trọng Lực (Gravity Fall & Freeze)',
      icon: '☄️',
      energyCost: 65,
      description: 'Ngưng đọng thời gian 7s, kích hoạt lực hút Susanoo dồn nén toàn bộ quân cờ xuống đáy tạo hàng loạt thế nối liền kề, và dựng Khiên Susanoo miễn nhiễm hiệu ứng 15s (PVP: Khóa đối thủ 4s)!',
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
      name: 'Laser Quỹ Đạo Chữ Thập & Bão Lửa (Orbital Laser & Solar x3)',
      icon: '🔥',
      energyCost: 55,
      description: 'Laser vệ tinh bắn quét sạch 1 hàng ngang và 1 cột dọc (chữ thập thông bàn), đồng thời kích hoạt Trạng Thái Bão Lửa 10s: x3 ĐIỂM SỐ mọi nước nối và hồi +2 giây mỗi lần ăn bài!',
      voiceLine: 'NHÂN DANH ĐOÀN TÀU ASTRAL, KHAI HỎA!',
      bannerColor: 'linear-gradient(135deg, #f97316, #b91c1c)',
    },
    ultimate: {
      id: 'orbital_cross_laser',
      name: 'Laser Quỹ Đạo Chữ Thập & Bão Lửa (Orbital Laser & Solar x3)',
      icon: '🔥',
      energyCost: 55,
      description: 'Laser vệ tinh bắn quét sạch 1 hàng ngang và 1 cột dọc (chữ thập thông bàn), đồng thời kích hoạt Trạng Thái Bão Lửa 10s: x3 ĐIỂM SỐ mọi nước nối và hồi +2 giây mỗi lần ăn bài!',
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
