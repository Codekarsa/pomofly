import { useState, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/app/contexts/AuthContext';

export interface EstimationResult {
  suggestedPomodoros: number;
  confidence: 'high' | 'medium' | 'low' | 'none';
  reasoning: string;
  similarTasksCount: number;
  userAccuracyRatio: number;
}

interface EstimationRecord {
  taskTitle: string;
  projectId: string | null;
  estimatedPomodoros: number;
  actualPomodoros: number;
  accuracy: number;
  keywords: string[];
  completedAt: Date;
}

function extractKeywords(title: string): string[] {
  const stopWords = ['the', 'a', 'an', 'to', 'for', 'of', 'and', 'in', 'on', 'with', 'is', 'it'];
  return title
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word));
}

function calculateSimilarity(
  newKeywords: string[],
  newProjectId: string | undefined,
  record: EstimationRecord
): number {
  let score = 0;
  
  // Keyword overlap (0-50 points)
  const overlap = newKeywords.filter(k => record.keywords.includes(k));
  score += (overlap.length / Math.max(newKeywords.length, 1)) * 50;
  
  // Same project (30 points)
  if (newProjectId && newProjectId === record.projectId) {
    score += 30;
  }
  
  return score;
}

function determineConfidence(count: number): 'high' | 'medium' | 'low' | 'none' {
  if (count >= 10) return 'high';
  if (count >= 5) return 'medium';
  if (count >= 2) return 'low';
  return 'none';
}

function calculateWeightedEstimate(
  similarTasks: Array<{ record: EstimationRecord; score: number; completedAt: Date }>
): number {
  if (similarTasks.length === 0) return 1;

  let weightedSum = 0;
  let totalWeight = 0;

  similarTasks.forEach(({ record, score, completedAt }) => {
    const daysSince = Math.max(1, (Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24));
    const recencyWeight = Math.max(0.1, 1 / Math.sqrt(daysSince));
    const weight = (score / 100) * recencyWeight;
    
    weightedSum += record.actualPomodoros * weight;
    totalWeight += weight;
  });

  return Math.round(weightedSum / totalWeight);
}

export function useEstimation() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getEstimate = useCallback(async (
    title: string,
    projectId?: string,
    userEstimate?: number
  ): Promise<EstimationResult | null> => {
    if (!user) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch user's estimation history
      const historyRef = collection(db, 'estimation_history');
      const q = query(
        historyRef,
        where('userId', '==', user.uid),
        orderBy('completedAt', 'desc'),
        limit(100)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return { suggestedPomodoros: userEstimate || 1, confidence: 'none', reasoning: 'No history yet', similarTasksCount: 0, userAccuracyRatio: 1 };
      }
      
      const records: EstimationRecord[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          completedAt: data.completedAt?.toDate?.() || new Date(data.completedAt)
        } as EstimationRecord;
      });
      const newKeywords = extractKeywords(title);
      
      // Find similar tasks
      const similarities = records.map(record => ({
        record,
        score: calculateSimilarity(newKeywords, projectId, record)
      })).filter(s => s.score > 20).sort((a, b) => b.score - a.score);
      
      const similarTasks = similarities.slice(0, 10);
      
      if (similarTasks.length === 0) {
        // Use global average
        const avgAccuracy = records.reduce((sum, r) => sum + r.accuracy, 0) / records.length;
        const suggestion = Math.round((userEstimate || 1) / avgAccuracy);
        return {
          suggestedPomodoros: Math.max(1, suggestion),
          confidence: 'low',
          reasoning: 'Based on your overall patterns',
          similarTasksCount: 0,
          userAccuracyRatio: avgAccuracy
        };
      }
      
      // Calculate weighted estimate of actual pomodoros from similar tasks
      const suggestedPomodoros = calculateWeightedEstimate(
        similarTasks.map(s => ({ ...s, completedAt: s.record.completedAt }))
      );
      const avgAccuracy = similarTasks.reduce((sum, s) => sum + s.record.accuracy, 0) / similarTasks.length;
      
      return {
        suggestedPomodoros: Math.max(1, suggestedPomodoros),
        confidence: determineConfidence(similarTasks.length),
        reasoning: `Based on ${similarTasks.length} similar tasks`,
        similarTasksCount: similarTasks.length,
        userAccuracyRatio: avgAccuracy
      };
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { getEstimate, loading, error };
}