// src/contexts/NotificationContext.tsx
// Context for CEO notification system - pending offer approvals

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeToPendingOfferApprovals,
  subscribeToRecentlyChosenOffers,
  PendingOfferNotification,
} from '../services/api/notifications';

interface NotificationContextType {
  // Pending offers (not yet chosen)
  pendingNotifications: PendingOfferNotification[];
  pendingCount: number;

  // Recently chosen offers (for strikethrough display)
  recentlyChosenNotifications: PendingOfferNotification[];

  // Combined list for dropdown display
  allNotifications: PendingOfferNotification[];

  // Loading state
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { userProfile } = useAuth();
  const [pendingNotifications, setPendingNotifications] = useState<PendingOfferNotification[]>([]);
  const [recentlyChosenNotifications, setRecentlyChosenNotifications] = useState<PendingOfferNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated
  const isAuthenticated = !!userProfile;

  useEffect(() => {
    // Skip subscriptions if not authenticated
    if (!isAuthenticated) {
      setPendingNotifications([]);
      setRecentlyChosenNotifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Subscribe to pending offer approvals
    const unsubscribePending = subscribeToPendingOfferApprovals((notifications) => {
      setPendingNotifications(notifications);
      setIsLoading(false);
    });

    // Subscribe to recently chosen offers (for strikethrough)
    const unsubscribeChosen = subscribeToRecentlyChosenOffers((notifications) => {
      setRecentlyChosenNotifications(notifications);
    });

    // Cleanup subscriptions on unmount or when user changes
    return () => {
      unsubscribePending();
      unsubscribeChosen();
    };
  }, [isAuthenticated]);

  // Combine notifications for dropdown display
  // Pending items first (sorted by most recent), then recently chosen items (strikethrough)
  const allNotifications: PendingOfferNotification[] = [
    ...pendingNotifications,
    ...recentlyChosenNotifications,
  ];

  const value: NotificationContextType = {
    pendingNotifications,
    pendingCount: pendingNotifications.length,
    recentlyChosenNotifications,
    allNotifications,
    isLoading,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
