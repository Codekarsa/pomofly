import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import {
  getGuestLabels,
  addGuestLabel,
  updateGuestLabel,
  deleteGuestLabel,
} from '../lib/guestStorage';

export interface Label {
  id: string;
  name: string;
  color: string;
  userId: string;
  createdAt: Date;
}

export const LABEL_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
] as const;

export function useLabels() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setIsGuest(true);
      const guestLabels = getGuestLabels();
      setLabels(guestLabels);
      setLoading(false);
      setError(null);
      return;
    }

    setIsGuest(false);
    const labelsQuery = query(
      collection(db, 'labels'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      labelsQuery,
      (querySnapshot) => {
        const labelList: Label[] = [];
        querySnapshot.forEach((docSnap) => {
          labelList.push({ id: docSnap.id, ...docSnap.data() } as Label);
        });
        setLabels(labelList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching labels:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addLabel = useCallback(async (name: string, color: string) => {
    const user = auth.currentUser;

    if (!user) {
      const newLabel = addGuestLabel(name, color);
      setLabels((prev) => [...prev, newLabel]);
      return newLabel.id;
    }

    try {
      const newLabel = {
        name,
        color,
        userId: user.uid,
        createdAt: new Date(),
      };
      const docRef = await addDoc(collection(db, 'labels'), newLabel);
      return docRef.id;
    } catch (err) {
      console.error('Error adding label:', err);
      throw err;
    }
  }, []);

  const updateLabel = useCallback(
    async (id: string, updates: { name?: string; color?: string }) => {
      const user = auth.currentUser;

      if (!user) {
        updateGuestLabel(id, updates);
        setLabels((prev) =>
          prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
        );
        return;
      }

      try {
        await updateDoc(doc(db, 'labels', id), updates);
      } catch (err) {
        console.error('Error updating label:', err);
        throw err;
      }
    },
    []
  );

  const deleteLabel = useCallback(async (id: string) => {
    const user = auth.currentUser;

    if (!user) {
      deleteGuestLabel(id);
      setLabels((prev) => prev.filter((l) => l.id !== id));
      return;
    }

    try {
      await deleteDoc(doc(db, 'labels', id));
    } catch (err) {
      console.error('Error deleting label:', err);
      throw err;
    }
  }, []);

  return {
    labels,
    loading,
    error,
    isGuest,
    addLabel,
    updateLabel,
    deleteLabel,
  };
}
