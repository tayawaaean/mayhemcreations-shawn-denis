/**
 * Account Switcher Component
 * Allows users to switch between customer and employee accounts
 */

import React, { useState } from 'react';
import { useMultiAccount } from '../shared/multiAccountContext';

interface AccountSwitcherProps {
  className?: string;
  showLabel?: boolean;
}

export default function AccountSwitcher({ className = '', showLabel = true }: AccountSwitcherProps) {
  const { 
    currentAccountType, 
    availableAccounts, 
    switchAccount, 
    getAccountInfo 
  } = useMultiAccount();
  
  const [isOpen, setIsOpen] = useState(false);

  const handleAccountSwitch = (accountType: 'customer' | 'employee') => {
    if (accountType !== currentAccountType) {
      const success = switchAccount(accountType);
      if (success) {
        setIsOpen(false);
        // Optionally show a success message
        console.log(`Switched to ${accountType} account`);
      }
    }
  };

  const getAccountDisplayName = (accountType: 'customer' | 'employee') => {
    const accountInfo = getAccountInfo(accountType);
    if (accountInfo) {
      return `${accountInfo.user.firstName} ${accountInfo.user.lastName}`;
    }
    return accountType === 'customer' ? 'Customer Account' : 'Employee Account';
  };

  const getAccountIcon = (accountType: 'customer' | 'employee') => {
    return accountType === 'customer' ? '🛒' : '👔';
  };

  const getCurrentAccountIcon = () => {
    return currentAccountType ? getAccountIcon(currentAccountType) : '👤';
  };

  if (availableAccounts.length <= 1) {
    // Don't show switcher if only one account or no accounts
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Switch Account
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <div className="flex items-center">
            <span className="text-lg mr-2">{getCurrentAccountIcon()}</span>
            <span className="block truncate">
              {currentAccountType ? getAccountDisplayName(currentAccountType) : 'Select Account'}
            </span>
          </div>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg
              className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
            {availableAccounts.map((account) => (
              <button
                key={account.type}
                onClick={() => handleAccountSwitch(account.type)}
                className={`w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                  currentAccountType === account.type ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                }`}
              >
                <div className="flex items-center">
                  <span className="text-lg mr-3">{getAccountIcon(account.type)}</span>
                  <div className="flex-1">
                    <div className="font-medium">{getAccountDisplayName(account.type)}</div>
                    <div className="text-sm text-gray-500 capitalize">
                      {account.type} • {account.user.email}
                    </div>
                  </div>
                  {currentAccountType === account.type && (
                    <span className="text-blue-600 text-sm font-medium">Current</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Compact version for headers/navbars
export function AccountSwitcherCompact({ className = '' }: { className?: string }) {
  const { 
    currentAccountType, 
    availableAccounts, 
    switchAccount 
  } = useMultiAccount();
  
  const [isOpen, setIsOpen] = useState(false);

  const handleAccountSwitch = (accountType: 'customer' | 'employee') => {
    if (accountType !== currentAccountType) {
      const success = switchAccount(accountType);
      if (success) {
        setIsOpen(false);
      }
    }
  };

  const getAccountIcon = (accountType: 'customer' | 'employee') => {
    return accountType === 'customer' ? '🛒' : '👔';
  };

  if (availableAccounts.length <= 1) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="text-lg">{getAccountIcon(currentAccountType || 'customer')}</span>
        <span className="hidden sm:block">Switch</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-64 bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none">
          {availableAccounts.map((account) => (
            <button
              key={account.type}
              onClick={() => handleAccountSwitch(account.type)}
              className={`w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                currentAccountType === account.type ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
              }`}
            >
              <div className="flex items-center">
                <span className="text-lg mr-3">{getAccountIcon(account.type)}</span>
                <div className="flex-1">
                  <div className="font-medium">{account.user.firstName} {account.user.lastName}</div>
                  <div className="text-sm text-gray-500 capitalize">
                    {account.type} • {account.user.email}
                  </div>
                </div>
                {currentAccountType === account.type && (
                  <span className="text-blue-600 text-sm font-medium">Current</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
