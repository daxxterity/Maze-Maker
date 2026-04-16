import { doc, setDoc, getDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { LevelData, CampaignData, SitemapData } from '../types';
import { sanitizeFirestoreData } from '../lib/gameUtils';

export const saveLevel = async (levelData: LevelData) => {
  await setDoc(doc(db, 'levels', levelData.id), sanitizeFirestoreData(levelData));
};

export const getLevels = async (userId?: string) => {
  const q = userId 
    ? query(collection(db, 'levels'), where('authorId', '==', userId), orderBy('createdAt', 'desc'))
    : query(collection(db, 'levels'), orderBy('createdAt', 'desc'), limit(50));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as LevelData);
};

export const saveCampaign = async (campaignData: CampaignData) => {
  await setDoc(doc(db, 'campaigns', campaignData.id), sanitizeFirestoreData(campaignData));
};

export const getCampaigns = async (userId?: string) => {
  const q = userId 
    ? query(collection(db, 'campaigns'), where('authorId', '==', userId), orderBy('createdAt', 'desc'))
    : query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'), limit(50));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as CampaignData);
};

export const saveSitemap = async (sitemapData: SitemapData) => {
  await setDoc(doc(db, 'sitemaps', sitemapData.id), sanitizeFirestoreData(sitemapData));
};

export const getSitemaps = async (userId?: string) => {
  const q = userId 
    ? query(collection(db, 'sitemaps'), where('authorId', '==', userId), orderBy('createdAt', 'desc'))
    : query(collection(db, 'sitemaps'), orderBy('createdAt', 'desc'), limit(50));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as SitemapData);
};
