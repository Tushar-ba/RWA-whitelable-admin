import { useEffect, useRef, useState } from 'react';
import { socketService } from '@/lib/socket';

export interface SocketHook {
  isConnected: boolean;
  socketId: string | undefined;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  sendPing: () => void;
}

export const useSocket = (): SocketHook => {
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | undefined>();
  const socketRef = useRef<typeof socketService | null>(null);

  useEffect(() => {
    socketRef.current = socketService;
    
    // Connect automatically when hook is mounted
    const socket = socketRef.current.connect();

    // Update state when connection changes
    const updateConnectionState = () => {
      setIsConnected(socketRef.current?.connected || false);
      setSocketId(socketRef.current?.socketId);
    };

    // Initial state update
    updateConnectionState();

    // Listen for connection events
    socket.on('connect', updateConnectionState);
    socket.on('disconnect', updateConnectionState);

    // Cleanup on unmount
    return () => {
      socket.off('connect', updateConnectionState);
      socket.off('disconnect', updateConnectionState);
    };
  }, []);

  const connect = () => {
    socketRef.current?.connect();
  };

  const disconnect = () => {
    socketRef.current?.disconnect();
    setIsConnected(false);
    setSocketId(undefined);
  };

  const emit = (event: string, data?: any) => {
    socketRef.current?.emit(event, data);
  };

  const sendPing = () => {
    socketRef.current?.sendPing();
  };

  return {
    isConnected,
    socketId,
    connect,
    disconnect,
    emit,
    sendPing,
  };
};