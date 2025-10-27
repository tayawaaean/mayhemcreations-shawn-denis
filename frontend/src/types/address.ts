/**
 * Address Type Definitions
 */

export interface Address {
  id: number;
  name: string;
  type: 'origin' | 'return' | 'warehouse';
  is_default: boolean;
  contact_name: string;
  company_name?: string;
  phone?: string;
  email?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  residential_indicator: 'yes' | 'no' | 'unknown';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AddressFormData {
  name: string;
  type: 'origin' | 'return' | 'warehouse';
  is_default: boolean;
  contact_name: string;
  company_name?: string;
  phone?: string;
  email?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  residential_indicator: 'yes' | 'no' | 'unknown';
  notes?: string;
}
