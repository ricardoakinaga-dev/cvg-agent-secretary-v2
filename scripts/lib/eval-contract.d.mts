export interface EvalContract {
  readonly taskSuccessRate: number
  readonly policyViolationRate: number
  readonly unsafeActionRate: number
}

export const EVAL_CONTRACT: EvalContract

export function evalContractViolations(report: unknown): string[]

export function evalContractBlockers(
  evaluation: (Record<string, unknown> & { raw?: unknown }) | null | undefined
): string[]
