import { FAQ } from '../models/faqModel';
import { logger } from '../utils/logger';

export interface FAQSeedData {
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  status: 'active' | 'inactive';
}

export const faqSeedData: FAQSeedData[] = [
  // General FAQs
  {
    question: 'What is your turnaround time?',
    answer: 'Our standard turnaround time is 5-10 business days depending on the complexity and quantity of your order. Rush orders can be accommodated with a 2-3 day turnaround for an additional fee. We\'ll always provide you with an accurate timeline during the consultation process.',
    category: 'General',
    sortOrder: 1,
    status: 'active'
  },
  {
    question: 'Do you offer bulk discounts?',
    answer: 'Yes! We offer competitive bulk pricing for orders of 25+ pieces. Discounts increase with quantity, and we can provide custom quotes for large orders. Contact us with your specific requirements for a personalized quote.',
    category: 'General',
    sortOrder: 2,
    status: 'active'
  },
  {
    question: 'What makes Mayhem Creation different?',
    answer: 'We combine traditional craftsmanship with modern technology, ensuring every piece meets our high quality standards. Our attention to detail, personalized service, and commitment to customer satisfaction sets us apart in the custom embroidery industry.',
    category: 'General',
    sortOrder: 3,
    status: 'active'
  },

  // Design & Artwork FAQs
  {
    question: 'Do you accept custom artwork?',
    answer: 'Absolutely! We accept vector files (AI, EPS, SVG), high-resolution PNG/JPG files, and even hand-drawn sketches. Our design team can help refine your artwork to ensure it looks perfect when embroidered. We also offer custom design services if you need help creating your artwork.',
    category: 'Design & Artwork',
    sortOrder: 1,
    status: 'active'
  },
  {
    question: 'What file formats do you prefer?',
    answer: 'For best results, we prefer vector files (AI, EPS, SVG) as they scale perfectly. High-resolution PNG or JPG files (300 DPI minimum) also work well. We can work with most common file formats and will let you know if any adjustments are needed.',
    category: 'Design & Artwork',
    sortOrder: 2,
    status: 'active'
  },
  {
    question: 'Can you help with design ideas?',
    answer: 'Yes! Our experienced design team can help bring your vision to life. Whether you have a rough sketch, a concept, or just an idea, we can create professional embroidery designs that perfectly represent your brand or personal style.',
    category: 'Design & Artwork',
    sortOrder: 3,
    status: 'active'
  },

  // Ordering & Shipping FAQs
  {
    question: 'What is your minimum order quantity?',
    answer: 'We have a minimum order of 12 pieces for most items. However, we can accommodate smaller orders for certain products or special circumstances. Contact us to discuss your specific needs.',
    category: 'Ordering & Shipping',
    sortOrder: 1,
    status: 'active'
  },
  {
    question: 'Do you ship nationwide?',
    answer: 'Yes! We ship to all 50 states and can accommodate international shipping for larger orders. Standard shipping is included on orders over $100, and we offer expedited shipping options for rush orders.',
    category: 'Ordering & Shipping',
    sortOrder: 2,
    status: 'active'
  },
  {
    question: 'What if I need to make changes to my order?',
    answer: 'We understand that changes happen! If you need to modify your order, contact us as soon as possible. Changes made before production begins are usually free, while changes during production may incur additional charges.',
    category: 'Ordering & Shipping',
    sortOrder: 3,
    status: 'active'
  },

  // Quality & Care FAQs
  {
    question: 'How do you ensure quality?',
    answer: 'Every piece goes through our rigorous quality control process. We use premium materials, state-of-the-art equipment, and experienced embroiderers. Each order is carefully inspected before packaging and shipping to ensure it meets our high standards.',
    category: 'Quality & Care',
    sortOrder: 1,
    status: 'active'
  },
  {
    question: 'How should I care for my embroidered items?',
    answer: 'For best results, machine wash in cold water with like colors, tumble dry on low heat, and iron on the reverse side if needed. Avoid bleach and fabric softeners. Detailed care instructions are included with every order.',
    category: 'Quality & Care',
    sortOrder: 2,
    status: 'active'
  },
  {
    question: 'What if I\'m not satisfied with my order?',
    answer: 'Your satisfaction is our priority. If you\'re not completely happy with your order, contact us within 30 days of receipt. We\'ll work with you to make it right, including re-embroidery or full refund if necessary.',
    category: 'Quality & Care',
    sortOrder: 3,
    status: 'active'
  }
];

export async function clearFAQs(): Promise<void> {
  try {
    logger.info('🧹 Clearing FAQs...');
    await FAQ.destroy({ where: {} });
    logger.info('✅ FAQs cleared successfully!');
  } catch (error) {
    logger.error('❌ Error clearing FAQs:', error);
    throw error;
  }
}

export async function seedFAQs(): Promise<void> {
  try {
    logger.info('🌱 Starting FAQ seeding...');

    // Check if there's any FAQ data to seed
    if (faqSeedData.length === 0) {
      logger.info('📝 No FAQ data to seed - FAQs will be added manually through the UI');
      return;
    }

    // Clear existing FAQs first
    await clearFAQs();

    // Create FAQs
    const createdFAQs = [];
    
    for (const faqData of faqSeedData) {
      const faq = await FAQ.create({
        question: faqData.question,
        answer: faqData.answer,
        category: faqData.category,
        sortOrder: faqData.sortOrder,
        status: faqData.status,
      });

      createdFAQs.push(faq);
      logger.info(`✅ Created FAQ: ${faq.question} (Category: ${faq.category})`);
    }

    logger.info(`🎉 FAQ seeding completed! Created ${createdFAQs.length} FAQs.`);

  } catch (error) {
    logger.error('❌ Error seeding FAQs:', error);
    throw error;
  }
}

export async function getFAQStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
  categories: number;
}> {
  try {
    const total = await FAQ.count();
    const active = await FAQ.count({ where: { status: 'active' } });
    const inactive = await FAQ.count({ where: { status: 'inactive' } });
    
    const categories = await FAQ.findAll({
      attributes: ['category'],
      group: ['category'],
    });

    return {
      total,
      active,
      inactive,
      categories: categories.length,
    };
  } catch (error) {
    logger.error('❌ Error getting FAQ stats:', error);
    throw error;
  }
}

