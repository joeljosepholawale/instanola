// Custom hook for automatic status polling every 3 seconds
import { useEffect, useRef } from 'react';
import { DaisySMSService } from '../services/daisySMS';

interface UseStatusPollingProps {
  rentals: Array<{ id: string; status: string }>;
  onStatusUpdate: (id: string, status: { status: string; code?: string }) => void;
  enabled?: boolean;
  interval?: number;
}

export function useStatusPolling({
  rentals,
  onStatusUpdate,
  enabled = true,
  interval = 3000 // 3 seconds
}: UseStatusPollingProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const daisyServiceRef = useRef<DaisySMSService | null>(null);

  useEffect(() => {
    const initService = async () => {
      daisyServiceRef.current = await DaisySMSService.createWithStoredKey();
    };
    initService();
  }, []);

  useEffect(() => {
    if (!enabled || !daisyServiceRef.current) {
      return;
    }

    const checkStatuses = async () => {
      if (!daisyServiceRef.current) return;

      // Only check waiting rentals
      const waitingRentals = rentals.filter(rental => rental.status === 'waiting');
      
      if (waitingRentals.length === 0) {
        return; // No rentals to check
      }
      
      for (const rental of waitingRentals) {
        try {
          const status = await daisyServiceRef.current.getStatus(rental.id, true);
          
          // Only update if status changed
          if (status.status !== rental.status || status.code) {
            onStatusUpdate(rental.id, status);
          }
        } catch (error) {
          console.error(`Error checking status for rental ${rental.id}:`, error);
        }
        
        // Add small delay between checks to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    };

    // Start polling if there are waiting rentals
    const waitingRentals = rentals.filter(rental => rental.status === 'waiting');
    if (waitingRentals.length > 0) {
      // Initial check
      checkStatuses();
      // Set up interval
      intervalRef.current = setInterval(checkStatuses, interval);
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [rentals, onStatusUpdate, enabled, interval]);

  // Manual check function
  const checkStatus = async (id: string) => {
    if (!daisyServiceRef.current) return;

    try {
      const status = await daisyServiceRef.current.getStatus(id, true);
      onStatusUpdate(id, status);
      return status;
    } catch (error) {
      console.error(`Error checking status for rental ${id}:`, error);
      throw error;
    }
  };

  return { checkStatus };
}