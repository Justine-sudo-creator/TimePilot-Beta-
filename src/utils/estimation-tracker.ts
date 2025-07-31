/**
 * Estimation tracking utility to learn from actual task completion times
 */

export interface TaskCompletion {
  taskId: string;
  category: string;
  estimatedHours: number;
  actualHours: number;
  completedAt: string;
  efficiency: number; // actualHours / estimatedHours
  factors: string[]; // complexity factors that were selected
}

export interface UserEstimationProfile {
  userId: string;
  categoryAccuracy: Record<string, {
    averageEfficiency: number; // <1 means overestimating, >1 means underestimating
    completionCount: number;
    lastUpdated: string;
    confidence: 'low' | 'medium' | 'high'; // based on sample size
  }>;
  overallEfficiency: number;
  totalCompletions: number;
}

class EstimationTracker {
  private storageKey = 'timepilot-estimation-profile';

  /**
   * Record completion of a task for learning
   */
  recordCompletion(completion: Omit<TaskCompletion, 'efficiency'>): void {
    const efficiency = completion.actualHours / completion.estimatedHours;
    const fullCompletion: TaskCompletion = {
      ...completion,
      efficiency
    };

    // Get existing profile
    const profile = this.getProfile();
    
    // Update category accuracy
    if (!profile.categoryAccuracy[completion.category]) {
      profile.categoryAccuracy[completion.category] = {
        averageEfficiency: efficiency,
        completionCount: 1,
        lastUpdated: new Date().toISOString(),
        confidence: 'low'
      };
    } else {
      const categoryData = profile.categoryAccuracy[completion.category];
      const newCount = categoryData.completionCount + 1;
      
      // Calculate rolling average
      categoryData.averageEfficiency = 
        (categoryData.averageEfficiency * categoryData.completionCount + efficiency) / newCount;
      categoryData.completionCount = newCount;
      categoryData.lastUpdated = new Date().toISOString();
      
      // Update confidence based on sample size
      if (newCount >= 10) categoryData.confidence = 'high';
      else if (newCount >= 5) categoryData.confidence = 'medium';
      else categoryData.confidence = 'low';
    }

    // Update overall efficiency
    profile.totalCompletions += 1;
    profile.overallEfficiency = 
      (profile.overallEfficiency * (profile.totalCompletions - 1) + efficiency) / profile.totalCompletions;

    this.saveProfile(profile);
    
    // Also save individual completion for detailed analysis
    this.saveCompletion(fullCompletion);
  }

  /**
   * Get adjusted estimate based on user's historical performance
   */
  getAdjustedEstimate(category: string, baseEstimate: number): {
    adjustedEstimate: number;
    confidence: 'low' | 'medium' | 'high';
    suggestion: string;
  } {
    const profile = this.getProfile();
    const categoryData = profile.categoryAccuracy[category];

    if (!categoryData || categoryData.completionCount < 3) {
      return {
        adjustedEstimate: baseEstimate,
        confidence: 'low',
        suggestion: `Not enough data for ${category} tasks. Your estimate will improve over time.`
      };
    }

    const adjustedEstimate = baseEstimate * categoryData.averageEfficiency;
    const efficiency = categoryData.averageEfficiency;
    
    let suggestion = '';
    if (efficiency > 1.2) {
      suggestion = `You typically take ${Math.round((efficiency - 1) * 100)}% longer than estimated for ${category} tasks.`;
    } else if (efficiency < 0.8) {
      suggestion = `You typically finish ${category} tasks ${Math.round((1 - efficiency) * 100)}% faster than estimated.`;
    } else {
      suggestion = `Your ${category} estimates are quite accurate!`;
    }

    return {
      adjustedEstimate,
      confidence: categoryData.confidence,
      suggestion
    };
  }

  /**
   * Get insights about user's estimation patterns
   */
  getEstimationInsights(): {
    overallTrend: 'overestimating' | 'underestimating' | 'accurate';
    worstCategory: string | null;
    bestCategory: string | null;
    suggestions: string[];
  } {
    const profile = this.getProfile();
    const suggestions: string[] = [];

    // Overall trend
    let overallTrend: 'overestimating' | 'underestimating' | 'accurate';
    if (profile.overallEfficiency > 1.1) {
      overallTrend = 'underestimating';
      suggestions.push('You tend to underestimate task duration. Consider adding 10-20% buffer time.');
    } else if (profile.overallEfficiency < 0.9) {
      overallTrend = 'overestimating';
      suggestions.push('You tend to overestimate task duration. You might be more efficient than you think!');
    } else {
      overallTrend = 'accurate';
      suggestions.push('Your time estimates are quite accurate overall. Great job!');
    }

    // Find best and worst categories
    let worstCategory: string | null = null;
    let bestCategory: string | null = null;
    let worstEfficiency = 0;
    let bestEfficiency = Infinity;

    Object.entries(profile.categoryAccuracy).forEach(([category, data]) => {
      if (data.completionCount >= 3) { // Only consider categories with enough data
        const deviationFromPerfect = Math.abs(data.averageEfficiency - 1);
        
        if (data.averageEfficiency > worstEfficiency) {
          worstEfficiency = data.averageEfficiency;
          worstCategory = category;
        }
        
        if (deviationFromPerfect < Math.abs(bestEfficiency - 1)) {
          bestEfficiency = data.averageEfficiency;
          bestCategory = category;
        }
      }
    });

    if (worstCategory && worstEfficiency > 1.3) {
      suggestions.push(`${worstCategory} tasks take you much longer than expected. Consider breaking them into smaller parts.`);
    }

    if (bestCategory && Math.abs(bestEfficiency - 1) < 0.1) {
      suggestions.push(`You're excellent at estimating ${bestCategory} tasks!`);
    }

    return {
      overallTrend,
      worstCategory,
      bestCategory,
      suggestions
    };
  }

  private getProfile(): UserEstimationProfile {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      return JSON.parse(stored);
    }
    
    return {
      userId: 'default',
      categoryAccuracy: {},
      overallEfficiency: 1.0,
      totalCompletions: 0
    };
  }

  private saveProfile(profile: UserEstimationProfile): void {
    localStorage.setItem(this.storageKey, JSON.stringify(profile));
  }

  private saveCompletion(completion: TaskCompletion): void {
    const completionsKey = 'timepilot-task-completions';
    const stored = localStorage.getItem(completionsKey);
    const completions: TaskCompletion[] = stored ? JSON.parse(stored) : [];
    
    // Keep only last 100 completions to prevent storage bloat
    completions.push(completion);
    if (completions.length > 100) {
      completions.splice(0, completions.length - 100);
    }
    
    localStorage.setItem(completionsKey, JSON.stringify(completions));
  }
}

export const estimationTracker = new EstimationTracker();
