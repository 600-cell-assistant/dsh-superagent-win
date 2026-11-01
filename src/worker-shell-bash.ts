/**
 * Preset shell executor: DSH's sandbox POSIX shell executor, with the deployment's worker environment stamped onto every command it
 * resolves. The entries (PATH with the shim directory first, and the git configuration naming the agent's credential helper) travel
 * per spawn through the subprocess `env` seam, so the host process's own environment is never rewritten: a person's Sessions in
 * the same profile keep their own PATH and git configuration while executor Sessions act as the agent account.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { ShellExecRequest, ShellExecSpec } from '@deepseek-ai/dsh-shell'
import { SandboxBashExecutor } from '@deepseek-ai/dsh-bash-sandbox'

/** The `workerEnvironment` service the bundle's main plugin publishes once setup has resolved the deployment. */
interface WorkerEnvironment { entries(): Record<string, string> }

/** Adds the worker entries to one resolved spec; the preset's `isolate` covers `shell` only, so this service stays reachable. */
const stamp = (ctx: Context, spec: ShellExecSpec): ShellExecSpec => {
  const provider = ctx.get('workerEnvironment') as WorkerEnvironment | undefined
  if (!provider) return spec
  return { ...spec, env: { ...spec.env, ...provider.entries() } }
}

export class WorkerBashExecutor extends SandboxBashExecutor {
  override resolve(request: ShellExecRequest): ShellExecSpec { return stamp(this.ctx, super.resolve(request)) }
}

export default WorkerBashExecutor
