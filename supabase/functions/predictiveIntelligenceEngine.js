/**
 * Predictive Intelligence Engine — Market & Behavior Algorithm
 *
 * Pipeline Orchestration: connects to Supabase, reads recent behavioral signals
 * and active market trends, calculates real-time demand/match scores per category,
 * and triggers an automated follow-up action when a score crosses 75%.
 *
 * Deploy as a Supabase edge function. Required environment variables:
 *   SUPABASE_URL              — your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service-role key (never expose client-side)
 */

// Algorithm weights
const HISTORICAL_BEHAVIOR_WEIGHT = 0.6; // weight given to local platform signals
const GLOBAL_MARKET_WEIGHT = 0.4;       // weight given to macro trend velocity
const HIGH_SCORE_THRESHOLD = 75.0;
const SIGNAL_FETCH_LIMIT = 200;

/**
 * Core predictive matching algorithm.
 * Calculates the final probability score (0–100) for a given market trend
 * category using weighted behavioral signals and market data.
 *
 * @param {Array} signals - behavioral signals for this category
 * @param {Object} trend  - market trend record with demand_index, velocity_score
 * @returns {number} score between 0 and 100
 */
function calculatePredictiveScore(signals, trend) {
  const demandIndex = Number(trend.demand_index || 0);

  if (!signals || signals.length === 0) {
    return parseFloat((demandIndex * GLOBAL_MARKET_WEIGHT).toFixed(2));
  }

  // Calculate internal interaction momentum from behavioral signals.
  // High-intent actions (purchase, deal_close) receive a 3× multiplier;
  // searches receive 1.5×; all other interactions default to 1×.
  const totalSignalWeight = signals.reduce((sum, sig) => {
    let multiplier = 1.0;
    if (sig.interaction_type === 'purchase' || sig.interaction_type === 'deal_close') {
      multiplier = 3.0;
    } else if (sig.interaction_type === 'search') {
      multiplier = 1.5;
    }
    return sum + (Number(sig.weight || 1) * multiplier);
  }, 0);

  const averageSignalScore = totalSignalWeight / signals.length;

  // Normalize both components to a 100-point scale
  const behavioralComponent = Math.min(averageSignalScore * 10, 50);
  const velocityScore = Number(trend.velocity_score || 0);
  const marketComponent = (demandIndex * 0.7 + velocityScore * 0.3) * 50;

  const finalScore =
    behavioralComponent * HISTORICAL_BEHAVIOR_WEIGHT +
    marketComponent * GLOBAL_MARKET_WEIGHT;

  return parseFloat(finalScore.toFixed(2));
}

/**
 * Executes the full prediction pipeline for all active market trend categories.
 * Returns an array of category results with computed scores.
 *
 * @param {string} supabaseUrl
 * @param {string} serviceRoleKey
 * @returns {Promise<Array>} results per category
 */
async function executePredictionPipeline(supabaseUrl, serviceRoleKey) {
  const headers = {
    'Content-Type': 'application/json',
    apikey: serviceRoleKey,
    Authorization: 'Bearer ' + serviceRoleKey
  };

  // Fetch recent behavioral signals (most recent first, capped at SIGNAL_FETCH_LIMIT)
  const signalsResp = await fetch(
    `${supabaseUrl}/rest/v1/behavioral_signals?order=created_at.desc&limit=${SIGNAL_FETCH_LIMIT}`,
    { headers }
  );
  if (!signalsResp.ok) {
    const err = await signalsResp.text();
    throw new Error(`Failed to fetch behavioral_signals: ${signalsResp.status} ${err}`);
  }
  const signals = await signalsResp.json();

  // Fetch active market trends
  const trendsResp = await fetch(
    `${supabaseUrl}/rest/v1/market_trends?select=*`,
    { headers }
  );
  if (!trendsResp.ok) {
    const err = await trendsResp.text();
    throw new Error(`Failed to fetch market_trends: ${trendsResp.status} ${err}`);
  }
  const trends = await trendsResp.json();

  const results = [];

  for (const trend of trends) {
    // Match signals to this trend category via the signal's metadata.category field
    const matchingSignals = signals.filter(
      (s) => s.metadata && s.metadata.category === trend.category
    );

    const score = calculatePredictiveScore(matchingSignals, trend);
    const highYield = score > HIGH_SCORE_THRESHOLD;

    if (highYield) {
      await triggerAutomatedAction(supabaseUrl, serviceRoleKey, trend.category, score, headers);
    }

    results.push({
      category: trend.category,
      score,
      high_yield: highYield,
      signal_count: matchingSignals.length
    });
  }

  return results;
}

/**
 * Autonomous action trigger: inserts a prediction alert into Supabase
 * when a category match score crosses the high-yield threshold.
 *
 * @param {string} supabaseUrl
 * @param {string} serviceRoleKey
 * @param {string} category
 * @param {number} score
 * @param {Object} headers - shared fetch headers
 */
async function triggerAutomatedAction(supabaseUrl, serviceRoleKey, category, score, headers) {
  const payload = {
    category,
    score,
    threshold: HIGH_SCORE_THRESHOLD,
    triggered_at: new Date().toISOString()
  };

  const resp = await fetch(`${supabaseUrl}/rest/v1/prediction_alerts`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    // Log but don't abort the pipeline — alert persistence is best-effort
    const err = await resp.text();
    console.warn(`prediction_alerts insert failed for ${category}: ${resp.status} ${err}`);
  }
}

/**
 * POST handler — invoke to run the full pipeline.
 * Accepts an optional JSON body (currently unused; reserved for future filters).
 */
export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
      { status: 500 }
    );
  }

  try {
    const results = await executePredictionPipeline(supabaseUrl, serviceRoleKey);

    const highYieldCategories = results.filter((r) => r.high_yield);

    return new Response(
      JSON.stringify({
        message: 'Predictive intelligence pipeline completed',
        total_categories_evaluated: results.length,
        high_yield_count: highYieldCategories.length,
        results,
        timestamp: new Date().toISOString()
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Predictive pipeline fault:', error.message);
    return new Response(
      JSON.stringify({ error: 'Pipeline execution failed', details: error.message }),
      { status: 500 }
    );
  }
}
