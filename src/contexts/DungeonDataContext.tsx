import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  limit, 
  orderBy 
} from 'firebase/firestore';
import { CampaignData, LevelData, SitemapData } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { useUser } from './UserContext';
import { where } from 'firebase/firestore';

interface DungeonDataContextType {
  campaigns: CampaignData[];
  levels: LevelData[];
  userLevels: LevelData[];
  sitemaps: SitemapData[];
  setCampaigns: React.Dispatch<React.SetStateAction<CampaignData[]>>;
  setLevels: React.Dispatch<React.SetStateAction<LevelData[]>>;
  setUserLevels: React.Dispatch<React.SetStateAction<LevelData[]>>;
  setSitemaps: React.Dispatch<React.SetStateAction<SitemapData[]>>;
  isLoading: boolean;
  error: Error | null;
}

const DungeonDataContext = createContext<DungeonDataContextType | undefined>(undefined);

export const DungeonDataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useUser();
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [levels, setLevels] = useState<LevelData[]>([]);
  const [userLevels, setUserLevels] = useState<LevelData[]>([]);
  const [sitemaps, setSitemaps] = useState<SitemapData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    
    // Listen to Campaigns
    const unsubCampaigns = onSnapshot(
      query(collection(db, 'campaigns'), limit(50)), 
      (snapshot) => {
        setCampaigns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CampaignData)));
        setIsLoading(false);
      }, 
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'campaigns');
        setError(err as Error);
      }
    );

    // Listen to Global Levels
    const unsubLevels = onSnapshot(
      query(collection(db, 'levels'), limit(50)), 
      (snapshot) => {
        setLevels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LevelData)));
      }, 
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'levels');
        setError(err as Error);
      }
    );

    // Listen to Sitemaps
    const unsubSitemaps = onSnapshot(
      query(collection(db, 'sitemaps'), limit(50)), 
      (snapshot) => {
        setSitemaps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SitemapData)));
      }, 
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'sitemaps');
        setError(err as Error);
      }
    );

    return () => {
      unsubCampaigns();
      unsubLevels();
      unsubSitemaps();
    };
  }, []);

  // UID Scoping: Listen to User's Levels
  useEffect(() => {
    if (!user) {
      setUserLevels([]);
      return;
    }

    const unsubUserLevels = onSnapshot(
      query(collection(db, 'levels'), where('authorId', '==', user.uid), limit(100)),
      (snapshot) => {
        setUserLevels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LevelData)));
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `levels (user: ${user.uid})`);
      }
    );

    return () => unsubUserLevels();
  }, [user]);

  return (
    <DungeonDataContext.Provider value={{ 
      campaigns, 
      levels, 
      userLevels,
      sitemaps, 
      setCampaigns,
      setLevels,
      setUserLevels,
      setSitemaps,
      isLoading, 
      error 
    }}>
      {children}
    </DungeonDataContext.Provider>
  );
};

export const useDungeonData = () => {
  const context = useContext(DungeonDataContext);
  if (context === undefined) {
    throw new Error('useDungeonData must be used within a DungeonDataProvider');
  }
  return context;
};
