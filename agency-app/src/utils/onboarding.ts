// src/utils/onboarding.ts
import { Client } from '../types/client';
import { UserProfile } from '../types/auth';

/**
 * Number of months to consider as onboarding period
 */
const ONBOARDING_MONTHS = 2;

/**
 * Calculate the number of months between two dates
 */
function getMonthsDifference(startDate: Date, endDate: Date): number {
  const years = endDate.getFullYear() - startDate.getFullYear();
  const months = endDate.getMonth() - startDate.getMonth();
  return years * 12 + months;
}

/**
 * Check if a client is in the onboarding period (< 2 months old)
 * @param client - Client object to check
 * @returns true if client is in onboarding period, false otherwise
 */
export function isClientOnboarding(client: Client): boolean {
  if (!client.createdAt) {
    return false; // If no createdAt, assume not onboarding (legacy client)
  }

  try {
    const createdDate = new Date(client.createdAt);
    const now = new Date();
    const monthsDiff = getMonthsDifference(createdDate, now);

    return monthsDiff < ONBOARDING_MONTHS;
  } catch (error) {
    console.error('Error parsing client createdAt date:', error);
    return false;
  }
}

/**
 * Check if a writer/user is in the onboarding period (< 2 months old)
 * @param user - UserProfile object to check
 * @returns true if writer is in onboarding period, false otherwise
 */
export function isWriterOnboarding(user: UserProfile): boolean {
  // Check createdAt first (new field), fall back to joinDate
  const dateString = (user as any).createdAt || user.joinDate;

  if (!dateString) {
    return false; // If no date, assume not onboarding (legacy user)
  }

  try {
    const joinedDate = new Date(dateString);
    const now = new Date();
    const monthsDiff = getMonthsDifference(joinedDate, now);

    return monthsDiff < ONBOARDING_MONTHS;
  } catch (error) {
    console.error('Error parsing user joinDate:', error);
    return false;
  }
}

/**
 * Get a user from an array by display name
 * @param users - Array of UserProfiles
 * @param displayName - Display name to search for
 * @returns UserProfile if found, null otherwise
 */
export function getUserByDisplayName(users: UserProfile[], displayName: string): UserProfile | null {
  return users.find(user => user.displayName === displayName) || null;
}

/**
 * Get a client from an array by client name
 * @param clients - Array of Clients
 * @param clientName - Client name to search for
 * @returns Client if found, null otherwise
 */
export function getClientByName(clients: Client[], clientName: string): Client | null {
  return clients.find(client => client.name === clientName) || null;
}
