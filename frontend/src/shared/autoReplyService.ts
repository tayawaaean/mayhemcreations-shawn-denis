export interface QuickReplyTemplate {
  id: string
  title: string
  content: string
  isActive: boolean
  category: string
  order: number
}

export interface AutoReplySettings {
  enabled: boolean
  delay: number // milliseconds
  templates: QuickReplyTemplate[]
}

class AutoReplyService {
  private settings: AutoReplySettings = {
    enabled: true,
    delay: 1000,
    templates: [
      {
        id: 'greeting',
        title: 'Welcome',
        content: 'Hi! Welcome to Mayhem Creation! How can I help you with your embroidery needs today?',
        isActive: true,
        category: 'General',
        order: 1
      },
      {
        id: 'pricing',
        title: 'Pricing Info',
        content: 'Our embroidery starts at $5 per piece for small designs. Prices vary based on size, complexity, and quantity. Would you like a custom quote?',
        isActive: true,
        category: 'Pricing',
        order: 2
      },
      {
        id: 'turnaround',
        title: 'Turnaround Time',
        content: 'Standard turnaround is 5-7 business days. Rush orders (2-3 days) are available for an additional 50% fee. Premium service (1 day) is available for select designs.',
        isActive: true,
        category: 'General',
        order: 3
      },
      {
        id: 'shipping',
        title: 'Shipping',
        content: 'We offer free shipping on orders over $50. Standard shipping takes 3-5 business days. Express shipping is available for rush deliveries.',
        isActive: true,
        category: 'Shipping',
        order: 4
      },
      {
        id: 'custom_design',
        title: 'Custom Designs',
        content: 'We love creating custom embroidery! Please send us your design files (AI, EPS, PNG, or JPG format). We\'ll provide a quote within 24 hours.',
        isActive: true,
        category: 'Services',
        order: 5
      },
      {
        id: 'bulk_orders',
        title: 'Bulk Orders',
        content: 'We offer special pricing for bulk orders! Contact us for a custom quote. We work with schools, businesses, and organizations regularly.',
        isActive: true,
        category: 'Pricing',
        order: 6
      }
    ]
  }

  // Load settings from localStorage or use defaults
  loadSettings(): AutoReplySettings {
    try {
      const saved = localStorage.getItem('autoReplySettings')
      if (saved) {
        const parsedSettings = JSON.parse(saved)
        // Merge with defaults to ensure new properties are included
        return {
          ...this.settings,
          ...parsedSettings,
          templates: parsedSettings.templates || this.settings.templates
        }
      }
    } catch (error) {
      console.error('Failed to load auto-reply settings:', error)
    }
    return this.settings
  }

  // Save settings to localStorage
  saveSettings(settings: AutoReplySettings): void {
    try {
      localStorage.setItem('autoReplySettings', JSON.stringify(settings))
      this.settings = settings
    } catch (error) {
      console.error('Failed to save auto-reply settings:', error)
    }
  }

  // Get active templates only
  getActiveTemplates(): QuickReplyTemplate[] {
    const settings = this.loadSettings()
    return settings.templates.filter(template => template.isActive)
  }

  // Get templates by category
  getTemplatesByCategory(category: string): QuickReplyTemplate[] {
    const settings = this.loadSettings()
    return settings.templates.filter(template => template.category === category)
  }

  // Add a new template
  addTemplate(template: Omit<QuickReplyTemplate, 'id' | 'order'>): QuickReplyTemplate {
    const settings = this.loadSettings()
    const newTemplate: QuickReplyTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      order: settings.templates.length + 1
    }

    settings.templates.push(newTemplate)
    this.saveSettings(settings)
    return newTemplate
  }

  // Update a template
  updateTemplate(id: string, updates: Partial<QuickReplyTemplate>): void {
    const settings = this.loadSettings()
    const index = settings.templates.findIndex(t => t.id === id)

    if (index !== -1) {
      settings.templates[index] = { ...settings.templates[index], ...updates }
      this.saveSettings(settings)
    }
  }

  // Delete a template
  deleteTemplate(id: string): void {
    const settings = this.loadSettings()
    settings.templates = settings.templates.filter(t => t.id !== id)
    this.saveSettings(settings)
  }

  // Reorder templates
  reorderTemplates(newOrder: QuickReplyTemplate[]): void {
    const settings = this.loadSettings()
    settings.templates = newOrder.map((template, index) => ({
      ...template,
      order: index + 1
    }))
    this.saveSettings(settings)
  }

  // Get all categories
  getCategories(): string[] {
    const settings = this.loadSettings()
    const categories = new Set(settings.templates.map(t => t.category))
    return Array.from(categories).sort()
  }

  // Get settings
  getSettings(): AutoReplySettings {
    return this.loadSettings()
  }

  // Update settings
  updateSettings(updates: Partial<AutoReplySettings>): void {
    const settings = this.loadSettings()
    const updatedSettings = { ...settings, ...updates }
    this.saveSettings(updatedSettings)
  }
}

// Create a singleton instance
export const autoReplyService = new AutoReplyService()
