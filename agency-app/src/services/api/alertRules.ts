// src/services/api/alertRules.ts
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../services/firebase/firestore';
import { Ticket, TeamMember, AlertRule, TicketStatus } from '../../types';
import { ticketWithSubcollectionsService } from './ticketSubcollections';

export const alertRulesService = {
  // Subscribe to all alert rules
  subscribeToAlertRules: (callback: (rules: AlertRule[]) => void) => {
    const q = query(collection(db, 'alertRules'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const rules: AlertRule[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AlertRule));
      callback(rules);
    });
  },

  // Get all alert rules
  getAllAlertRules: async (): Promise<AlertRule[]> => {
    try {
      const q = query(collection(db, 'alertRules'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AlertRule));
    } catch (error) {
      console.error('Error fetching alert rules:', error);
      throw error;
    }
  },

  // Get enabled alert rules only
  getEnabledAlertRules: async (): Promise<AlertRule[]> => {
    try {
      const q = query(
        collection(db, 'alertRules'), 
        where('enabled', '==', true),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AlertRule));
    } catch (error) {
      console.error('Error fetching enabled alert rules:', error);
      throw error;
    }
  },

  // Get single alert rule
  getAlertRule: async (ruleId: string): Promise<AlertRule | null> => {
    try {
      const ruleDoc = await getDoc(doc(db, 'alertRules', ruleId));
      if (ruleDoc.exists()) {
        return { id: ruleDoc.id, ...ruleDoc.data() } as AlertRule;
      }
      return null;
    } catch (error) {
      console.error('Error fetching alert rule:', error);
      throw error;
    }
  },

  // Create new alert rule
  createAlertRule: async (ruleData: Omit<AlertRule, 'id'>): Promise<string> => {
    try {
      const now = new Date().toISOString();
      const docRef = await addDoc(collection(db, 'alertRules'), {
        ...ruleData,
        createdAt: now,
        updatedAt: now
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding alert rule:', error);
      throw error;
    }
  },

  // Update alert rule
  updateAlertRule: async (ruleId: string, updateData: Partial<AlertRule>): Promise<void> => {
    try {
      await updateDoc(doc(db, 'alertRules', ruleId), {
        ...updateData,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating alert rule:', error);
      throw error;
    }
  },

  // Toggle alert rule enabled/disabled
  toggleAlertRule: async (ruleId: string, enabled: boolean): Promise<void> => {
    try {
      await updateDoc(doc(db, 'alertRules', ruleId), {
        enabled,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error toggling alert rule:', error);
      throw error;
    }
  },

  // Delete alert rule
  deleteAlertRule: async (ruleId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'alertRules', ruleId));
    } catch (error) {
      console.error('Error deleting alert rule:', error);
      throw error;
    }
  },

  // Test ticket-based alert rule - returns tickets that would match the rule (updated for subcollections)
  testTaskBasedAlertRule: async (conditions: { checkType?: 'status-duration' | 'ticket-age'; statuses: TicketStatus[]; daysInState: number; clientName?: string; ticketType?: Ticket['type']; }): Promise<any[]> => {
    try {
      // Force console output even in production builds
      const debugLog = (message: string, ...args: any[]) => {
        window.console?.log?.(message, ...args);
      };

      const checkType = conditions.checkType || 'status-duration';

      debugLog('🔍 Testing Alert Rule Conditions:');
      debugLog('   Check Type:', checkType);
      debugLog('   Statuses:', conditions.statuses);
      debugLog('   Days threshold:', conditions.daysInState);
      debugLog('   Client filter:', conditions.clientName || 'None');
      debugLog('   Type filter:', conditions.ticketType || 'None');
      debugLog('');

      const matchingTickets: any[] = [];

      // Special handling for ticket-age with no specific status (check all incomplete)
      if (checkType === 'ticket-age' && (!conditions.statuses || conditions.statuses.length === 0)) {
        debugLog('🎂 Ticket-age mode with no status filter - checking all incomplete tickets');

        let q = query(collection(db, 'tickets'));

        // Apply client filter if specified
        if (conditions.clientName) {
          q = query(q, where('clientName', '==', conditions.clientName));
        }

        // Apply type filter if specified
        if (conditions.ticketType) {
          q = query(q, where('type', '==', conditions.ticketType));
        }

        const snapshot = await getDocs(q);
        debugLog(`   Found ${snapshot.docs.length} total tickets`);

        snapshot.docs.forEach(doc => {
          const ticket = { id: doc.id, ...doc.data() } as any;

          // Skip completed tickets
          if (ticket.status === 'done' || ticket.status === 'invoiced' || ticket.status === 'paid') {
            debugLog(`   ⏭️  Skipping completed ticket: "${ticket.title}" (status: ${ticket.status})`);
            return;
          }

          debugLog(`🔍 Testing ticket: "${ticket.title}" (ID: ${ticket.id})`);
          debugLog(`   Status: ${ticket.status}, Client: ${ticket.clientName}, Type: ${ticket.type}`);

          // Calculate days since creation
          debugLog(`   🎂 Calculating ticket age (days since creation)...`);
          let createdAt: Date | null = null;

          if (ticket.createdAt) {
            if (ticket.createdAt.seconds) {
              createdAt = new Date(ticket.createdAt.seconds * 1000);
            } else if (typeof ticket.createdAt === 'string') {
              createdAt = new Date(ticket.createdAt);
            } else if (ticket.createdAt.toDate) {
              createdAt = ticket.createdAt.toDate();
            }
          }

          if (createdAt && !isNaN(createdAt.getTime())) {
            const now = new Date();
            const diffTime = now.getTime() - createdAt.getTime();
            const calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            debugLog(`   📅 Created: ${createdAt.toISOString()}`);
            debugLog(`   ⏰ Ticket age: ${calculatedDays} days (threshold: ${conditions.daysInState})`);

            if (calculatedDays >= conditions.daysInState) {
              debugLog(`   🚨 ALERT TRIGGERED! Adding to results`);
              matchingTickets.push({
                id: ticket.id,
                title: ticket.title,
                status: ticket.status,
                clientName: ticket.clientName,
                type: ticket.type,
                assignedTo: ticket.assignedTo,
                daysInCurrentState: calculatedDays,
                checkType: checkType
              });
            } else {
              debugLog(`   ✅ OK (${calculatedDays} < ${conditions.daysInState} days)`);
            }
          } else {
            debugLog(`   ❌ Invalid or missing creation date`);
          }
        });
      } else {
        // Original behavior: Get tickets that match the status criteria
        for (const status of conditions.statuses) {
          debugLog(`📋 Checking status: ${status}`);

        let q = query(collection(db, 'tickets'), where('status', '==', status));

        // Apply client filter in query if specified
        if (conditions.clientName) {
          q = query(q, where('clientName', '==', conditions.clientName));
        }

        // Apply type filter in query if specified
        if (conditions.ticketType) {
          q = query(q, where('type', '==', conditions.ticketType));
        }

        const snapshot = await getDocs(q);
        debugLog(`   Found ${snapshot.docs.length} tickets with status ${status}`);

        if (snapshot.docs.length === 0) continue;

        // Get ticket IDs and load with timeline subcollections
        const ticketIds = snapshot.docs.map(doc => doc.id);
        debugLog(`   Loading timeline data for ${ticketIds.length} tickets...`);

        const ticketsWithTimeline = await ticketWithSubcollectionsService.getTicketsWithSubcollections(
          ticketIds,
          { content: false, financials: false, timeline: true }
        );
        debugLog(`   Successfully loaded ${ticketsWithTimeline.length} tickets with timeline data`);

        ticketsWithTimeline.forEach(ticket => {
          debugLog(`🔍 Testing ticket: "${ticket.title}" (ID: ${ticket.id})`);
          debugLog(`   Status: ${ticket.status}, Client: ${ticket.clientName}, Type: ${ticket.type}`);

          const now = new Date();
          let calculatedDays: number = 0;

          if (checkType === 'ticket-age') {
            // Calculate days since ticket creation
            debugLog(`   🎂 Calculating ticket age (days since creation)...`);
            let createdAt: Date | null = null;

            if (ticket.createdAt) {
              if (ticket.createdAt.seconds) {
                createdAt = new Date(ticket.createdAt.seconds * 1000);
              } else if (typeof ticket.createdAt === 'string') {
                createdAt = new Date(ticket.createdAt);
              } else if (ticket.createdAt.toDate) {
                createdAt = ticket.createdAt.toDate();
              }
            }

            if (createdAt && !isNaN(createdAt.getTime())) {
              const diffTime = now.getTime() - createdAt.getTime();
              calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              debugLog(`   📅 Created: ${createdAt.toISOString()}`);
              debugLog(`   ⏰ Ticket age: ${calculatedDays} days (threshold: ${conditions.daysInState})`);
            } else {
              debugLog(`   ❌ Invalid or missing creation date`);
              return;
            }
          } else {
            // Calculate days in current state using timeline data
            debugLog(`   ⏱️ Calculating days in current state...`);
            let stateStartDate: Date | null = null;

            // Get state start date from timeline subcollection
            if (ticket.timeline?.stateHistory) {
              const stateHistory = ticket.timeline.stateHistory;
              const stateStartTime = stateHistory[status as keyof typeof stateHistory];
              debugLog(`   ✅ Timeline data found`);

              if (stateStartTime) {
                // Handle different date formats
                if (typeof stateStartTime === 'string') {
                  stateStartDate = new Date(stateStartTime);
                } else if (stateStartTime && typeof stateStartTime === 'object' && 'toDate' in stateStartTime) {
                  stateStartDate = (stateStartTime as any).toDate();
                } else if (stateStartTime && typeof stateStartTime === 'object' && 'seconds' in stateStartTime) {
                  stateStartDate = new Date((stateStartTime as any).seconds * 1000);
                }
                debugLog(`   📅 State start time: ${stateStartDate?.toISOString()}`);
              } else {
                debugLog(`   ❌ No ${status} entry in state history`);
              }
            } else {
              debugLog(`   ❌ No timeline data found`);
            }

            // Fallback to creation date for 'todo' status if no timeline data
            if (!stateStartDate && status === 'todo' && ticket.createdAt) {
              debugLog(`   🔄 Using fallback for todo status`);
              if (ticket.createdAt.seconds) {
                stateStartDate = new Date(ticket.createdAt.seconds * 1000);
              } else if (typeof ticket.createdAt === 'string') {
                stateStartDate = new Date(ticket.createdAt);
              } else if (ticket.createdAt.toDate) {
                stateStartDate = ticket.createdAt.toDate();
              }
              debugLog(`   📅 Fallback date: ${stateStartDate?.toISOString()}`);
            }

            if (stateStartDate && !isNaN(stateStartDate.getTime())) {
              const diffTime = now.getTime() - stateStartDate.getTime();
              calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              debugLog(`   ⏰ Days in ${status}: ${calculatedDays} (threshold: ${conditions.daysInState})`);
            } else {
              debugLog(`   ❌ Invalid or missing state start date`);
              return;
            }
          }

          if (calculatedDays >= conditions.daysInState) {
            debugLog(`   🚨 ALERT TRIGGERED! Adding to results`);
            matchingTickets.push({
              id: ticket.id,
              title: ticket.title,
              status: ticket.status,
              clientName: ticket.clientName,
              type: ticket.type,
              assignedTo: ticket.assignedTo,
              daysInCurrentState: calculatedDays,
              checkType: checkType
            });
          } else {
            debugLog(`   ✅ OK (${calculatedDays} < ${conditions.daysInState} days)`);
          }
        });
        }
      }

      debugLog(`\n📊 FINAL RESULTS: Found ${matchingTickets.length} matching tickets`);
      matchingTickets.forEach((ticket, index) => {
        const description = ticket.checkType === 'ticket-age'
          ? `${ticket.daysInCurrentState} days old`
          : `${ticket.daysInCurrentState} days in ${ticket.status}`;
        debugLog(`${index + 1}. "${ticket.title}" - ${description}`);
      });

      return matchingTickets;
    } catch (error) {
      console.error('❌ Error testing ticket-based alert rule:', error);
      if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
      }
      throw error;
    }
  },

  // Test writer-based alert rule
  testWriterBasedAlertRule: async (conditions: { alertType: 'no-tickets-assigned' | 'overloaded' | 'inactive'; thresholdDays?: number; maxTickets?: number; writerName?: string; }): Promise<any[]> => {
    try {
      const results: any[] = [];
      
      // Get all writers and managers
      const usersSnapshot = await getDocs(
        query(collection(db, 'users'), where('role', 'in', ['Writer', 'Manager']))
      );
      const writers: TeamMember[] = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        displayName: doc.data().displayName || '',
        email: doc.data().email || '',
        role: doc.data().role,
        compensation: doc.data().compensation
      }));

      // Get all tickets (using new collection name for consistency)
      const ticketsSnapshot = await getDocs(collection(db, 'tickets'));
      const tickets: Ticket[] = ticketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Ticket));

      if (conditions.alertType === 'no-tickets-assigned') {
        // Find writers with no tickets assigned
        writers.forEach(writer => {
          if (conditions.writerName && writer.displayName !== conditions.writerName) {
            return; // Skip if specific writer filter doesn't match
          }

          const writerTickets = tickets.filter(ticket => ticket.assignedTo === writer.displayName);
          if (writerTickets.length === 0) {
            results.push({
              writerName: writer.displayName,
              email: writer.email,
              issue: 'No tickets assigned',
              taskCount: 0
            });
          }
        });
      } else if (conditions.alertType === 'overloaded') {
        // Find writers with too many active tickets
        const maxTickets = conditions.maxTickets || 5;
        writers.forEach(writer => {
          if (conditions.writerName && writer.displayName !== conditions.writerName) {
            return;
          }

          const activeTickets = tickets.filter(ticket =>
            ticket.assignedTo === writer.displayName &&
            (ticket.status === 'in_progress' || ticket.status === 'internal_review' || ticket.status === 'client_review')
          );

          if (activeTickets.length > maxTickets) {
            results.push({
              writerName: writer.displayName,
              email: writer.email,
              issue: `Overloaded (${activeTickets.length} active tickets)`,
              taskCount: activeTickets.length,
              maxTickets
            });
          }
        });
      } else if (conditions.alertType === 'inactive') {
        // Find writers who haven't had task updates recently
        const thresholdDays = conditions.thresholdDays || 7;
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

        writers.forEach(writer => {
          if (conditions.writerName && writer.displayName !== conditions.writerName) {
            return;
          }

          const writerTickets = tickets.filter(ticket => ticket.assignedTo === writer.displayName);
          const hasRecentActivity = writerTickets.some(ticket => {
            const updatedAt = ticket.updatedAt?.toDate?.() || new Date(ticket.updatedAt);
            return updatedAt > thresholdDate;
          });

          if (writerTickets.length > 0 && !hasRecentActivity) {
            results.push({
              writerName: writer.displayName,
              email: writer.email,
              issue: `Inactive for ${thresholdDays}+ days`,
              taskCount: writerTickets.length,
              thresholdDays
            });
          }
        });
      }

      return results;
    } catch (error) {
      console.error('Error testing writer-based alert rule:', error);
      throw error;
    }
  },

  // Test client-based alert rule
  testClientBasedAlertRule: async (conditions: { alertType: 'no-recent-tickets' | 'no-new-tickets'; thresholdDays: number; clientName?: string; }): Promise<any[]> => {
    try {
      const results: any[] = [];
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - conditions.thresholdDays);

      // Get all clients or specific client if filter is set
      const clientsQuery = conditions.clientName
        ? query(collection(db, 'clients'), where('name', '==', conditions.clientName))
        : query(collection(db, 'clients'));

      const clientsSnapshot = await getDocs(clientsQuery);

      let clients = clientsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        ...doc.data()
      }));

      // If specific client name is provided but not found in clients collection,
      // check if there are tasks for this client name (virtual client)
      if (clientsSnapshot.empty && conditions.clientName) {
        const ticketsForClientSnapshot = await getDocs(
          query(collection(db, 'tickets'), where('clientName', '==', conditions.clientName), limit(1))
        );

        if (!ticketsForClientSnapshot.empty) {
          // Create virtual client for testing
          clients = [{ id: 'virtual', name: conditions.clientName }];
        } else {
          return results;
        }
      } else if (clientsSnapshot.empty) {
        return results;
      }

      // Check each client for inactivity
      for (const client of clients) {
        let ticketsQuery;
        let activityType = '';


        if (conditions.alertType === 'no-recent-tickets') {
          // Check for tickets created since threshold date
          ticketsQuery = query(
            collection(db, 'tickets'),
            where('clientName', '==', client.name),
            where('createdAt', '>', Timestamp.fromDate(thresholdDate))
          );
          activityType = 'ticket creation';
        } else if (conditions.alertType === 'no-new-tickets') {
          // Check for any ticket activity (updates) since threshold date
          ticketsQuery = query(
            collection(db, 'tickets'),
            where('clientName', '==', client.name),
            where('updatedAt', '>', Timestamp.fromDate(thresholdDate))
          );
          activityType = 'ticket activity';
        } else {
          continue;
        }


        const recentTicketsSnapshot = await getDocs(ticketsQuery);


        if (recentTicketsSnapshot.empty) {

          // No recent activity - find last activity date
          const isCreatedAtQuery = conditions.alertType === 'no-recent-tickets';
          const lastActivityQuery = query(
            collection(db, 'tickets'),
            where('clientName', '==', client.name),
            orderBy(isCreatedAtQuery ? 'createdAt' : 'updatedAt', 'desc'),
            limit(1)
          );

          try {
            const lastActivitySnapshot = await getDocs(lastActivityQuery);
            let lastActivityDate: Date | undefined;
            let daysSinceLastActivity = conditions.thresholdDays;

            if (!lastActivitySnapshot.empty) {
              const lastTicket = lastActivitySnapshot.docs[0].data();
              const timestamp = isCreatedAtQuery
                ? lastTicket.createdAt
                : lastTicket.updatedAt;

              if (timestamp) {
                lastActivityDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
                if (lastActivityDate) {
                  const diffTime = new Date().getTime() - lastActivityDate.getTime();
                  daysSinceLastActivity = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }
              }
            }

            const result = {
              clientName: client.name,
              daysSinceLastActivity,
              lastActivityDate: lastActivityDate?.toLocaleDateString(),
              issue: `No ${activityType} for ${daysSinceLastActivity} days`
            };
            results.push(result);
          } catch (orderError) {
            // If orderBy fails (might be missing index), just add basic result
            console.warn(`Could not get last activity for client ${client.name}, using basic result:`, orderError);
            results.push({
              clientName: client.name,
              daysSinceLastActivity: conditions.thresholdDays,
              issue: `No ${activityType} for ${conditions.thresholdDays}+ days`
            });
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Error testing client-based alert rule:', error);
      throw error;
    }
  },

  // Generic test method that handles both types
  testAlertRule: async (rule: AlertRule): Promise<any[]> => {
    // Handle ticket-based alert rules
    if (rule.type === 'ticket-based') {
      return alertRulesService.testTaskBasedAlertRule(rule.conditions);
    } else if (rule.type === 'writer-based') {
      return alertRulesService.testWriterBasedAlertRule(rule.conditions);
    } else if (rule.type === 'client-based') {
      return alertRulesService.testClientBasedAlertRule(rule.conditions);
    }
    return [];
  }
};