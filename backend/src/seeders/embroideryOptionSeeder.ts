import { EmbroideryOption } from '../models';
import { logger } from '../utils/logger';

export interface EmbroideryOptionSeedData {
  name: string;
  description: string;
  price: number;
  image: string; // Base64 encoded image
  stitches: number;
  estimatedTime: string;
  category: 'coverage' | 'threads' | 'material' | 'border' | 'backing' | 'upgrades' | 'cutting';
  level: 'basic' | 'standard' | 'premium' | 'luxury';
  isPopular: boolean;
  isActive: boolean;
  isIncompatible?: string[];
}

export const embroideryOptionSeedData: EmbroideryOptionSeedData[] = [
  // ORIGINAL MOCK DATA - COVERAGE OPTIONS
  {
    name: 'Small Coverage (2x2 inches)',
    description: 'Perfect for small logos or simple designs',
    price: 5.0,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5TbWFsbDwvdGV4dD48L3N2Zz4=',
    stitches: 2000,
    estimatedTime: '1 day',
    category: 'coverage',
    level: 'basic',
    isPopular: true,
    isActive: true
  },
  {
    name: 'Medium Coverage (4x4 inches)',
    description: 'Ideal for most designs and logos',
    price: 8.0,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5NZWRpdW08L3RleHQ+PC9zdmc+',
    stitches: 4000,
    estimatedTime: '1-2 days',
    category: 'coverage',
    level: 'standard',
    isPopular: true,
    isActive: true
  },
  {
    name: 'Large Coverage (6x6 inches)',
    description: 'For large, detailed designs',
    price: 12.0,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5MYXJnZTwvdGV4dD48L3N2Zz4=',
    stitches: 6000,
    estimatedTime: '2-3 days',
    category: 'coverage',
    level: 'premium',
    isPopular: false,
    isActive: true
  },

  // ORIGINAL MOCK DATA - THREAD OPTIONS
  {
    name: 'Cotton Thread',
    description: 'Standard cotton embroidery thread',
    price: 0.0,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI2ZmMDAwMCIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Db3R0b248L3RleHQ+PC9zdmc+',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'threads',
    level: 'basic',
    isPopular: true,
    isActive: true
  },
  {
    name: 'Metallic Thread',
    description: 'Premium metallic thread for special effects',
    price: 2.0,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI2ZmZDAwMCIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5NZXRhbGxpYzwvdGV4dD48L3N2Zz4=',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'threads',
    level: 'premium',
    isPopular: false,
    isActive: true
  },

  // COMPREHENSIVE COVERAGE LEVELS
  {
    name: '50% Coverage - Mostly Text',
    description: 'Perfect for text-heavy designs with minimal graphics',
    price: 0,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj41MCU8L3RleHQ+PC9zdmc+',
    stitches: 3000,
    estimatedTime: '1-2 days',
    category: 'coverage',
    level: 'basic',
    isPopular: false,
    isActive: true
  },
  {
    name: '75% Coverage - Balanced',
    description: 'Ideal balance of detail and cost for most designs',
    price: 14.50,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj43NSU8L3RleHQ+PC9zdmc+',
    stitches: 6000,
    estimatedTime: '2-3 days',
    category: 'coverage',
    level: 'standard',
    isPopular: true,
    isActive: true
  },
  {
    name: '100% Coverage - Most Detailed',
    description: 'Full coverage embroidery for intricate, detailed designs',
    price: 27.00,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj4xMDAlPC90ZXh0Pjwvc3ZnPg==',
    stitches: 10000,
    estimatedTime: '3-4 days',
    category: 'coverage',
    level: 'premium',
    isPopular: false,
    isActive: true
  },

  // BASE MATERIALS
  {
    name: 'Polyester Blend Twill',
    description: 'Standard, durable material perfect for most applications',
    price: 0,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2VlZWVlZSIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Ud2lsbDwvdGV4dD48L3N2Zz4=',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'material',
    level: 'basic',
    isPopular: true,
    isActive: true
  },
  {
    name: 'Felt',
    description: 'Soft, unique texture that stands out from standard patches',
    price: 12.78,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2ZmY2NiYiIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5GZWx0PC90ZXh0Pjwvc3ZnPg==',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'material',
    level: 'standard',
    isPopular: false,
    isActive: true
  },
  {
    name: 'Black Ballistic Nylon',
    description: 'Ultra-durable military-grade material for heavy use',
    price: 69.90,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5CYWxsaXN0aWM8L3RleHQ+PC9zdmc+',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'material',
    level: 'luxury',
    isPopular: false,
    isActive: true
  },
  {
    name: 'Camouflage Material',
    description: 'Tactical camo pattern for outdoor and military applications',
    price: 26.63,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzQ0NDQ0NCIvPjxyZWN0IHg9IjIwIiB5PSIyMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjNjY2NjY2Ii8+PHJlY3QgeD0iNjAiIHk9IjQwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiM4ODg4ODgiLz48L3N2Zz4=',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'material',
    level: 'premium',
    isPopular: false,
    isActive: true
  },
  {
    name: 'Reflective Material (Silver)',
    description: 'High-visibility reflective backing for safety applications',
    price: 58.58,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2NjY2NjYyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5SZWZsZWN0aXZlPC90ZXh0Pjwvc3ZnPg==',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'material',
    level: 'luxury',
    isPopular: false,
    isActive: true
  },

  // BORDER & EDGE OPTIONS
  {
    name: 'No Border',
    description: 'Clean cut edge without additional finishing',
    price: 0,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBCb3JkZXI8L3RleHQ+PC9zdmc+',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'border',
    level: 'basic',
    isPopular: false,
    isActive: true
  },
  {
    name: 'Embroidered Border',
    description: 'Classic embroidered edge that follows your design shape',
    price: 0,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y3ZjdmNyIvPjxyZWN0IHg9IjUiIHk9IjUiIHdpZHRoPSI5MCIgaGVpZ2h0PSI5MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjMiLz48dGV4dCB4PSI1MCIgeT0iNTUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzMzMyIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Qm9yZGVyPC90ZXh0Pjwvc3ZnPg==',
    stitches: 1000,
    estimatedTime: '1 day',
    category: 'border',
    level: 'standard',
    isPopular: true,
    isActive: true
  },
  {
    name: 'Merrowed Border',
    description: 'Professional overlock stitch for clean, finished edges',
    price: 20.24,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y3ZjdmNyIvPjxyZWN0IHg9IjUiIHk9IjUiIHdpZHRoPSI5MCIgaGVpZ2h0PSI5MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1kYXNoYXJyYXk9IjUsNSIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5NZXJyb3dlZDwvdGV4dD48L3N2Zz4=',
    stitches: 0,
    estimatedTime: '1 day',
    category: 'border',
    level: 'premium',
    isPopular: false,
    isActive: true,
    isIncompatible: ['border-embroidered']
  },

  // THREAD OPTIONS
  {
    name: 'Standard Polyester Thread',
    description: 'Durable, colorfast thread for everyday use',
    price: 0,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI2ZmMDAwMCIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5TdGQ8L3RleHQ+PC9zdmc+',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'threads',
    level: 'basic',
    isPopular: true,
    isActive: true
  },
  {
    name: 'Metallic Thread',
    description: 'Shiny metallic thread for premium look',
    price: 8.50,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI2ZmZDAwMCIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5NZXQ8L3RleHQ+PC9zdmc+',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'threads',
    level: 'premium',
    isPopular: false,
    isActive: true
  },
  {
    name: 'Glow-in-the-Dark Thread',
    description: 'Special thread that glows in low light conditions',
    price: 12.00,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iIzAwZmYwMCIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5HbG93PC90ZXh0Pjwvc3ZnPg==',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'threads',
    level: 'luxury',
    isPopular: false,
    isActive: true
  },

  // BACKING OPTIONS
  {
    name: 'Standard Backing',
    description: 'Standard backing for most applications',
    price: 0,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2VlZWVlZSIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5TdGQ8L3RleHQ+PC9zdmc+',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'backing',
    level: 'basic',
    isPopular: true,
    isActive: true
  },
  {
    name: 'Iron-On Backing',
    description: 'Heat-activated adhesive backing for easy application',
    price: 5.00,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2ZmY2NiYiIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Jcm9uLU9uPC90ZXh0Pjwvc3ZnPg==',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'backing',
    level: 'standard',
    isPopular: false,
    isActive: true
  },

  // UPGRADES
  {
    name: 'Rush Processing',
    description: 'Expedited processing for faster delivery',
    price: 15.00,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI2ZmMDAwMCIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5SdXNoPC90ZXh0Pjwvc3ZnPg==',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'upgrades',
    level: 'premium',
    isPopular: false,
    isActive: true
  },
  {
    name: 'Extra Durable Stitching',
    description: 'Reinforced stitching for maximum durability',
    price: 8.00,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iIzAwMDAwMCIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5EdXJhYmxlPC90ZXh0Pjwvc3ZnPg==',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'upgrades',
    level: 'standard',
    isPopular: false,
    isActive: true
  },

  // CUTTING OPTIONS
  {
    name: 'Standard Cut',
    description: 'Clean, straight cut edges',
    price: 0,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAiIGhlaWdodD0iODAiIHg9IjEwIiB5PSIxMCIgZmlsbD0iI2Y3ZjdmNyIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCIgeT0iNTUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzMzMyIgdGV4dC1hbmNob3I9Im1pZGRsZSI+U3RkPC90ZXh0Pjwvc3ZnPg==',
    stitches: 0,
    estimatedTime: '0 days',
    category: 'cutting',
    level: 'basic',
    isPopular: true,
    isActive: true
  },
  {
    name: 'Die Cut to Shape',
    description: 'Custom die-cut to match your design shape exactly',
    price: 12.00,
    image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNTAsMTAgTDEwLDUwIEw1MCw5MCBMOTAsNTAgWiIgZmlsbD0iI2Y3ZjdmNyIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSI1MCIgeT0iNTUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI4IiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5EaWU8L3RleHQ+PC9zdmc+',
    stitches: 0,
    estimatedTime: '1 day',
    category: 'cutting',
    level: 'premium',
    isPopular: false,
    isActive: true
  }
];

export const clearEmbroideryOptions = async (): Promise<void> => {
  try {
    logger.info('Clearing embroidery options...');
    await EmbroideryOption.destroy({ where: {} });
    logger.info('✅ Embroidery options cleared successfully!');
  } catch (error) {
    logger.error('Error clearing embroidery options:', error);
    throw error;
  }
};

export const seedEmbroideryOptions = async (clearFirst: boolean = false): Promise<void> => {
  try {
    logger.info('Starting embroidery options seeding...');

    // Clear existing data if requested
    if (clearFirst) {
      await clearEmbroideryOptions();
    } else {
      // Check if embroidery options already exist
      const existingCount = await EmbroideryOption.count();
      if (existingCount > 0) {
        logger.info(`Embroidery options already exist (${existingCount} records). Skipping seeding.`);
        return;
      }
    }

    // Create embroidery options
    for (const optionData of embroideryOptionSeedData) {
      await EmbroideryOption.create({
        name: optionData.name,
        description: optionData.description,
        price: optionData.price,
        image: optionData.image,
        stitches: optionData.stitches,
        estimatedTime: optionData.estimatedTime,
        category: optionData.category,
        level: optionData.level,
        isPopular: optionData.isPopular,
        isActive: optionData.isActive,
        isIncompatible: optionData.isIncompatible ? JSON.stringify(optionData.isIncompatible) : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    logger.info(`Successfully seeded ${embroideryOptionSeedData.length} embroidery options`);
  } catch (error) {
    logger.error('Error seeding embroidery options:', error);
    throw error;
  }
};
