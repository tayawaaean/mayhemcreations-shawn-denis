// Environment configuration service for centralized access to environment variables
// This service provides type-safe access to all environment variables

export interface EnvConfig {
  // Google OAuth Configuration
  googleClientId: string
  googleOAuthScriptUrl: string
  
  // API Configuration
  apiBaseUrl: string
  
  // App Configuration
  appName: string
  appDomain: string
  appEnv: 'development' | 'production'
  
  // Contact Information
  contactEmail: string
  ordersEmail: string
  phone1: string
  phone2: string
  
  // Business Information
  businessAddress1: string
  businessAddress2: string
  businessHoursWeekday: string
  businessHoursSaturday: string
  businessHoursSunday: string
  
  // Demo Accounts
  demoAdminEmail: string
  demoShawnEmail: string
  demoManagerEmail: string
  demoDesignerEmail: string
  demoCustomer1Email: string
  demoCustomer2Email: string
  demoCustomer3Email: string
  demoCustomer4Email: string
  demoCustomer5Email: string
  
  // External Services
  uiAvatarsBaseUrl: string
  placeholderImageUrl: string
  unsplashBaseUrl: string
}

class EnvConfigService {
  private config: EnvConfig

  constructor() {
    this.config = this.loadConfig()
  }

  private loadConfig(): EnvConfig {
    // Helper function to get environment variable with fallback
    const getEnvVar = (key: string, fallback: string = ''): string => {
      const value = (import.meta as any).env[key]
      if (value === undefined || value === '') {
        console.warn(`Environment variable ${key} is not set, using fallback: ${fallback}`)
        return fallback
      }
      return value
    }

    return {
      // Google OAuth Configuration
      googleClientId: getEnvVar('VITE_REACT_APP_GOOGLE_CLIENT_ID', ''),
      googleOAuthScriptUrl: getEnvVar('VITE_REACT_APP_GOOGLE_OAUTH_SCRIPT_URL', 'https://accounts.google.com/gsi/client'),
      
      // API Configuration
      apiBaseUrl: getEnvVar('VITE_REACT_APP_API_URL', 'http://localhost:5001/api/v1'),
      
      // App Configuration
      appName: getEnvVar('VITE_REACT_APP_APP_NAME', 'Mayhem Creations'),
      appDomain: getEnvVar('VITE_REACT_APP_APP_DOMAIN', 'localhost:3002'),
      appEnv: (getEnvVar('VITE_REACT_APP_APP_ENV', 'development') as 'development' | 'production'),
      
      // Contact Information
      contactEmail: getEnvVar('VITE_REACT_APP_CONTACT_EMAIL', 'hello@mayhemcreation.com'),
      ordersEmail: getEnvVar('VITE_REACT_APP_ORDERS_EMAIL', 'orders@mayhemcreation.com'),
      phone1: getEnvVar('VITE_REACT_APP_PHONE_1', '(555) 123-4567'),
      phone2: getEnvVar('VITE_REACT_APP_PHONE_2', '(555) 987-6543'),
      
      // Business Information
      businessAddress1: getEnvVar('VITE_REACT_APP_BUSINESS_ADDRESS_1', '123 Embroidery Lane'),
      businessAddress2: getEnvVar('VITE_REACT_APP_BUSINESS_ADDRESS_2', 'Craft City, CC 12345'),
      businessHoursWeekday: getEnvVar('VITE_REACT_APP_BUSINESS_HOURS_WEEKDAY', 'Mon-Fri: 8AM-6PM'),
      businessHoursSaturday: getEnvVar('VITE_REACT_APP_BUSINESS_HOURS_SATURDAY', 'Sat: 9AM-4PM'),
      businessHoursSunday: getEnvVar('VITE_REACT_APP_BUSINESS_HOURS_SUNDAY', 'Sun: Closed'),
      
      // Demo Accounts - Updated to match userSeeder data
      demoAdminEmail: getEnvVar('VITE_REACT_APP_DEMO_ADMIN_EMAIL', 'admin@mayhemcreation.com'),
      demoShawnEmail: getEnvVar('VITE_REACT_APP_DEMO_SHAWN_EMAIL', 'shawn.denis@mayhemcreation.com'),
      demoManagerEmail: getEnvVar('VITE_REACT_APP_DEMO_MANAGER_EMAIL', 'manager@mayhemcreation.com'),
      demoDesignerEmail: getEnvVar('VITE_REACT_APP_DEMO_DESIGNER_EMAIL', 'designer@mayhemcreation.com'),
      demoCustomer1Email: getEnvVar('VITE_REACT_APP_DEMO_CUSTOMER1_EMAIL', 'customer1@example.com'),
      demoCustomer2Email: getEnvVar('VITE_REACT_APP_DEMO_CUSTOMER2_EMAIL', 'customer2@example.com'),
      demoCustomer3Email: getEnvVar('VITE_REACT_APP_DEMO_CUSTOMER3_EMAIL', 'customer3@example.com'),
      demoCustomer4Email: getEnvVar('VITE_REACT_APP_DEMO_CUSTOMER4_EMAIL', 'customer4@example.com'),
      demoCustomer5Email: getEnvVar('VITE_REACT_APP_DEMO_CUSTOMER5_EMAIL', 'customer5@example.com'),
      
      // External Services
      uiAvatarsBaseUrl: getEnvVar('VITE_REACT_APP_UI_AVATARS_BASE_URL', 'https://ui-avatars.com/api'),
      placeholderImageUrl: getEnvVar('VITE_REACT_APP_PLACEHOLDER_IMAGE_URL', 'https://via.placeholder.com/400x400/f3f4f6/9ca3af?text=No+Image'),
      unsplashBaseUrl: getEnvVar('VITE_REACT_APP_UNSPLASH_BASE_URL', 'https://images.unsplash.com'),
    }
  }

  // Get the entire configuration
  public getConfig(): EnvConfig {
    return { ...this.config }
  }

  // Get specific configuration values
  public getGoogleClientId(): string {
    return this.config.googleClientId
  }

  public getApiBaseUrl(): string {
    return this.config.apiBaseUrl
  }

  public getAppName(): string {
    return this.config.appName
  }

  public getAppDomain(): string {
    return this.config.appDomain
  }

  public getAppEnv(): 'development' | 'production' {
    return this.config.appEnv
  }

  public getContactEmail(): string {
    return this.config.contactEmail
  }

  public getOrdersEmail(): string {
    return this.config.ordersEmail
  }

  public getPhone1(): string {
    return this.config.phone1
  }

  public getPhone2(): string {
    return this.config.phone2
  }

  public getBusinessAddress(): { line1: string; line2: string } {
    return {
      line1: this.config.businessAddress1,
      line2: this.config.businessAddress2
    }
  }

  public getBusinessHours(): { weekday: string; saturday: string; sunday: string } {
    return {
      weekday: this.config.businessHoursWeekday,
      saturday: this.config.businessHoursSaturday,
      sunday: this.config.businessHoursSunday
    }
  }

  public getDemoAccounts(): {
    admin: string
    shawn: string
    manager: string
    designer: string
    customer1: string
    customer2: string
    customer3: string
    customer4: string
    customer5: string
  } | null {
    // Only return demo accounts in development mode
    if (this.config.appEnv !== 'development') {
      return null
    }
    
    return {
      admin: this.config.demoAdminEmail,
      shawn: this.config.demoShawnEmail,
      manager: this.config.demoManagerEmail,
      designer: this.config.demoDesignerEmail,
      customer1: this.config.demoCustomer1Email,
      customer2: this.config.demoCustomer2Email,
      customer3: this.config.demoCustomer3Email,
      customer4: this.config.demoCustomer4Email,
      customer5: this.config.demoCustomer5Email
    }
  }

  public getExternalServices(): {
    uiAvatars: string
    placeholder: string
    unsplash: string
  } {
    return {
      uiAvatars: this.config.uiAvatarsBaseUrl,
      placeholder: this.config.placeholderImageUrl,
      unsplash: this.config.unsplashBaseUrl
    }
  }

  // Check if we're in development mode
  public isDevelopment(): boolean {
    return this.config.appEnv === 'development'
  }

  // Check if we're in production mode
  public isProduction(): boolean {
    return this.config.appEnv === 'production'
  }

  // Check if demo accounts are available (only in development)
  public hasDemoAccounts(): boolean {
    return this.config.appEnv === 'development'
  }

  // Get Google OAuth script URL
  public getGoogleOAuthScriptUrl(): string {
    return this.config.googleOAuthScriptUrl
  }

  // Validate required configuration
  public validateConfig(): { isValid: boolean; missingVars: string[] } {
    const requiredVars = [
      'VITE_REACT_APP_GOOGLE_CLIENT_ID',
      'VITE_REACT_APP_API_URL'
    ]

    const missingVars: string[] = []

    requiredVars.forEach(varName => {
      if (!(import.meta as any).env[varName]) {
        missingVars.push(varName)
      }
    })

    return {
      isValid: missingVars.length === 0,
      missingVars
    }
  }
}

// Export singleton instance
export const envConfig = new EnvConfigService()
