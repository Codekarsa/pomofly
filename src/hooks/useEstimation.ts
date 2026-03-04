import { useState, useCallback } from 'react';
import { auth } from '../lib/firebase';
import { getEstimationHistory, getProjectEstimationHistory } from '../lib/firebase';
import { extractKeywords, type EstimationRecord } from '../lib/validation';

export interface EstimationResult {
  suggestedPomodoros: number;
  confidence: 'high' | 'medium' | 'low' | 'none';
  reasoning: string;
  similarTasksCount: number;
  userAccuracyRatio: number;
}

export interface EstimationOptions {
  title: string;
  projectId?: string;
  userEstimate?: number;
}

/**
 * Hook for intelligent time estimation based on user history
 */
export function useEstimation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Calculate similarity between new task and historical task
   * Returns score from 0-100
   */
  const calculateSimilarity = useCallback((
    newTask: { title: string; projectId?: string },
    historicalTask: EstimationRecord
  ): number => {
    let score = 0;
    
    // Keyword overlap (0-50 points)
    const newKeywords = extractKeywords(newTask.title);
    const historicalKeywords = historicalTask.keywords;
    
    if (newKeywords.length > 0) {
      const overlap = newKeywords.filter(k => historicalKeywords.includes(k));
      score += (overlap.length / newKeywords.length) * 50;
    }
    
    // Same project (30 points)
    if (newTask.projectId && newTask.projectId === historicalTask.projectId) {
      score += 30;
    }
    
    // Similar title length (20 points) - proxy for complexity
    const lengthRatio = Math.min(
      newTask.title.length / historicalTask.taskTitle.length,
      historicalTask.taskTitle.length / newTask.title.length
    );
    score += lengthRatio * 20;
    
    return score; // 0-100
  }, []);

  /**
   * Determine confidence level based on number of similar tasks
   */
  const determineConfidence = useCallback((similarTasks: number): 'high' | 'medium' | 'low' | 'none' => {
    if (similarTasks >= 10) return 'high';
    if (similarTasks >= 5) return 'medium';
    if (similarTasks >= 2) return 'low';
    return 'none';
  }, []);

  /**
   * Calculate weighted average of similar tasks
   */
  const calculateWeightedEstimate = useCallback((
    similarTasks: Array<{ task: EstimationRecord; similarity: number }>
  ): number => {
    if (similarTasks.length === 0) return 1;

    // Weight by similarity score and recency
    let weightedSum = 0;
    let totalWeight = 0;

    similarTasks.forEach(({ task, similarity }) => {
      // Recency weight: more recent tasks get higher weight
      const daysSinceCompletion = Math.max(1, 
        (Date.now() - task.completedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const recencyWeight = Math.max(0.1, 1 / Math.sqrt(daysSinceCompletion));
      
      // Combined weight: similarity × recency
      const weight = (similarity / 100) * recencyWeight;
      
      weightedSum += task.actualPomodoros * weight;
      totalWeight += weight;
    });

    return Math.round(weightedSum / totalWeight);
  }, []);

  /**
   * Calculate user's overall estimation accuracy
   */
  const calculateUserAccuracy = useCallback((history: EstimationRecord[]): number => {
    if (history.length === 0) return 1.0;

    const accuracySum = history.reduce((sum, record) => sum + record.accuracy, 0);
    return accuracySum / history.length;
  }, []);

  /**
   * Get estimation for a new task
   */
  const getEstimate = useCallback(async (options: EstimationOptions): Promise<EstimationResult | null> => {
    const user = auth.currentUser;
    
    if (!user) {
      // Guest mode - no estimation available
      return null;
    }

    if (options.title.length < 5) {
      // Too short to provide meaningful estimation
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch user's estimation history
      const history = await getEstimationHistory(user.uid, 100);
      
      if (history.length < 2) {
        // Not enough history for estimation
        setLoading(false);
        return {
          suggestedPomodoros: 1,
          confidence: 'none',
          reasoning: 'Not enough completed tasks for estimation',
          similarTasksCount: 0,
          userAccuracyRatio: 1.0
        };
      }

      // Find similar tasks
      const similarTasks = history
        .map(task => ({
          task,
          similarity: calculateSimilarity(options, task)
        }))
        .filter(({ similarity }) => similarity > 20) // Minimum similarity threshold
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 20); // Top 20 most similar tasks

      const similarTasksCount = similarTasks.length;
      const confidence = determineConfidence(similarTasksCount);

      if (confidence === 'none') {
        setLoading(false);
        return {
          suggestedPomodoros: Math.round(history.reduce((sum, task) => sum + task.actualPomodoros, 0) / history.length),
          confidence: 'none',
          reasoning: 'No similar tasks found, using your average',
          similarTasksCount,
          userAccuracyRatio: calculateUserAccuracy(history)
        };
      }

      // Calculate weighted estimate
      const suggestedPomodoros = Math.max(1, calculateWeightedEstimate(similarTasks));
      const userAccuracyRatio = calculateUserAccuracy(history);

      // Adjust for user's historical bias
      const adjustedEstimate = Math.round(suggestedPomodoros * userAccuracyRatio);
      
      // Generate reasoning
      let reasoning = `Based on ${similarTasksCount} similar tasks`;
      if (options.projectId && similarTasks.some(({ task }) => task.projectId === options.projectId)) {
        reasoning += ' in this project';
      }
      
      setLoading(false);
      return {
        suggestedPomodoros: Math.max(1, adjustedEstimate),
        confidence,
        reasoning,
        similarTasksCount,
        userAccuracyRatio
      };

    } catch (err) {
      console.error('Error getting estimation:', err);
      setError(err as Error);
      setLoading(false);
      return null;
    }
  }, [calculateSimilarity, determineConfidence, calculateWeightedEstimate, calculateUserAccuracy]);

  /**
   * Get project-specific estimation
   */
  const getProjectEstimate = useCallback(async (options: EstimationOptions): Promise<EstimationResult | null> => {
    if (!options.projectId) {
      return getEstimate(options);
    }

    const user = auth.currentUser;
    
    if (!user) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Get project-specific history first
      const projectHistory = await getProjectEstimationHistory(user.uid, options.projectId, 50);
      
      if (projectHistory.length >= 5) {
        // Use project-specific estimation if we have enough data
        const similarTasks = projectHistory
          .map(task => ({
            task,
            similarity: calculateSimilarity(options, task)
          }))
          .filter(({ similarity }) => similarity > 15) // Lower threshold for project tasks
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 10);

        if (similarTasks.length >= 2) {
          const suggestedPomodoros = Math.max(1, calculateWeightedEstimate(similarTasks));
          const confidence = determineConfidence(similarTasks.length);
          
          setLoading(false);
          return {
            suggestedPomodoros,
            confidence,
            reasoning: `Based on ${similarTasks.length} similar tasks in this project`,
            similarTasksCount: similarTasks.length,
            userAccuracyRatio: calculateUserAccuracy(projectHistory)
          };
        }
      }

      // Fall back to general estimation
      setLoading(false);
      return getEstimate(options);

    } catch (err) {
      console.error('Error getting project estimation:', err);
      setError(err as Error);
      setLoading(false);
      return null;
    }
  }, [getEstimate, calculateSimilarity, calculateWeightedEstimate, calculateUserAccuracy, determineConfidence]);

  return {
    getEstimate,
    getProjectEstimate,
    loading,
    error
  };
}