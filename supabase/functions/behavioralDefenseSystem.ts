/**
 * Autonomous Behavioral Defense System
 * =====================================
 * Implements a three-layer mathematical consensus pipeline to validate
 * transaction payloads before they reach business logic controllers.
 *
 * Core equation — Aggregated Trust Score α(T):
 *   α(T) = Σ(w_i · v_i) / Σ(w_i)
 *
 * Each layer converts α(T) to a percentage. If the percentage falls
 * below the KILL_THRESHOLD the layer triggers a localized kill-switch
 * and the pipeline stops immediately without throwing.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentVerdict {
  /** Human-readable name of the security agent. */
  name: string;
  /** Relative authority weight (positive number). */
  weight: number;
  /** Trust score produced by the agent in the range [0.0, 1.0]. */
  verdict: number;
}

export interface FilterLayer {
  /** Descriptive name of the checkpoint layer. */
  layerName: string;
  /** Ordered list of agents that vote in this layer. */
  agents: AgentVerdict[];
}

export type PipelineStatus = "PASSED" | "KILLED";

export interface LayerResult {
  layerName: string;
  scorePercent: number;
  status: PipelineStatus;
}

export interface PipelineResult {
  /** Overall outcome across all layers. */
  status: PipelineStatus;
  /**
   * Name of the layer that triggered the kill-switch, or null when all
   * layers pass.
   */
  killedAtLayer: string | null;
  /** Per-layer breakdown. */
  layers: LayerResult[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum acceptable consensus percentage to pass a filter layer. */
const KILL_THRESHOLD = 99.5;

// ---------------------------------------------------------------------------
// Core consensus function
// ---------------------------------------------------------------------------

/**
 * Calculates the weighted arithmetic mean of agent verdicts.
 *
 * α(T) = Σ(w_i · v_i) / Σ(w_i)
 *
 * @param agents - Array of agents each carrying a weight and a verdict [0,1].
 * @returns Consensus score in the range [0.0, 1.0].
 * @throws {Error} When the agent array is empty or total weight is zero.
 */
export function calculateWeightedConsensus(agents: AgentVerdict[]): number {
  if (agents.length === 0) {
    throw new Error("calculateWeightedConsensus: agent list must not be empty.");
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (const agent of agents) {
    if (agent.weight <= 0) {
      throw new Error(
        `calculateWeightedConsensus: agent "${agent.name}" has non-positive weight ${agent.weight}.`
      );
    }
    if (agent.verdict < 0 || agent.verdict > 1) {
      throw new Error(
        `calculateWeightedConsensus: agent "${agent.name}" verdict ${agent.verdict} is outside [0, 1].`
      );
    }
    weightedSum += agent.weight * agent.verdict;
    totalWeight += agent.weight;
  }

  if (totalWeight === 0) {
    throw new Error(
      "calculateWeightedConsensus: total agent weight must be greater than zero."
    );
  }

  return weightedSum / totalWeight;
}

// ---------------------------------------------------------------------------
// Layer evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluates a single filter layer against the kill threshold.
 *
 * @param layer - The checkpoint layer containing its agents.
 * @returns A `LayerResult` with the calculated percentage and pass/kill status.
 */
function evaluateLayer(layer: FilterLayer): LayerResult {
  const alpha = calculateWeightedConsensus(layer.agents);
  const scorePercent = alpha * 100;
  const status: PipelineStatus = scorePercent >= KILL_THRESHOLD ? "PASSED" : "KILLED";

  return {
    layerName: layer.layerName,
    scorePercent,
    status,
  };
}

// ---------------------------------------------------------------------------
// Pre-configured filter layers
// ---------------------------------------------------------------------------

/**
 * Builds the three default filter layers from agent verdict scores.
 *
 * @param scores - A flat record mapping each agent name to its verdict [0,1].
 */
function buildDefaultLayers(scores: Record<string, number>): FilterLayer[] {
  const v = (name: string): number => {
    if (!(name in scores)) {
      throw new Error(
        `inspectTransactionPattern: missing verdict score for agent "${name}".`
      );
    }
    return scores[name];
  };

  return [
    {
      layerName: "FILTER_1_PERIMETER_EDGE_CHECKPOINT",
      agents: [
        { name: "Network_Agent",      weight: 5, verdict: v("Network_Agent") },
        { name: "Bot_Detection_Agent", weight: 8, verdict: v("Bot_Detection_Agent") },
        { name: "Rate_Limiter_Agent",  weight: 7, verdict: v("Rate_Limiter_Agent") },
      ],
    },
    {
      layerName: "FILTER_2_STRUCTURAL_PAYLOAD_CHECKPOINT",
      agents: [
        { name: "Injection_Detection_Agent", weight: 10, verdict: v("Injection_Detection_Agent") },
        { name: "XSS_Scanner_Agent",          weight: 9,  verdict: v("XSS_Scanner_Agent") },
        { name: "Payload_Format_Agent",        weight: 6,  verdict: v("Payload_Format_Agent") },
      ],
    },
    {
      layerName: "FILTER_3_DEEP_BUSINESS_COMPLIANCE_CHECKPOINT",
      agents: [
        { name: "Financial_Fraud_Agent",       weight: 10, verdict: v("Financial_Fraud_Agent") },
        { name: "Legal_Compliance_Agent",      weight: 10, verdict: v("Legal_Compliance_Agent") },
        { name: "Identity_Verification_Agent", weight: 8,  verdict: v("Identity_Verification_Agent") },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

/**
 * Runs the transaction payload sequentially through all three defense layers.
 *
 * Each layer applies the weighted consensus equation and converts the result
 * to a percentage score. If any layer scores below 99.5% the pipeline
 * immediately triggers a localized kill-switch for that layer and returns
 * without evaluating subsequent layers.
 *
 * @example
 * ```ts
 * const result = inspectTransactionPattern({
 *   Network_Agent:               1.0,
 *   Bot_Detection_Agent:         1.0,
 *   Rate_Limiter_Agent:          1.0,
 *   Injection_Detection_Agent:   1.0,
 *   XSS_Scanner_Agent:           1.0,
 *   Payload_Format_Agent:        1.0,
 *   Financial_Fraud_Agent:       1.0,
 *   Legal_Compliance_Agent:      1.0,
 *   Identity_Verification_Agent: 1.0,
 * });
 * // → { status: "PASSED", killedAtLayer: null, layers: [...] }
 * ```
 *
 * @param agentScores - Record mapping each of the nine canonical agent names
 *   to their individual verdict in the range [0.0, 1.0].
 * @returns A `PipelineResult` describing the outcome of each layer and the
 *   overall pass/kill decision.
 */
export function inspectTransactionPattern(
  agentScores: Record<string, number>
): PipelineResult {
  const layers = buildDefaultLayers(agentScores);
  const evaluatedLayers: LayerResult[] = [];

  for (const layer of layers) {
    const result = evaluateLayer(layer);
    evaluatedLayers.push(result);

    if (result.status === "KILLED") {
      return {
        status: "KILLED",
        killedAtLayer: result.layerName,
        layers: evaluatedLayers,
      };
    }
  }

  return {
    status: "PASSED",
    killedAtLayer: null,
    layers: evaluatedLayers,
  };
}
