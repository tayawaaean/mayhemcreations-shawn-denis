/**
 * Addresses Page
 * Admin page for managing addresses
 */

import React from 'react';
import AddressManagement from '../components/AddressManagement';

const Addresses: React.FC = () => {
  return (
    <div className="p-6">
      <AddressManagement />
    </div>
  );
};

export default Addresses;
