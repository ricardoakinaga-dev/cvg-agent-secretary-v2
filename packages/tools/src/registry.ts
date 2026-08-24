import type { ToolHandler, ToolResult } from './contracts.ts'

export class ToolRegistry {
  private readonly handlers = new Map<string, ToolHandler>()

  register(name: string, handler: ToolHandler): ToolRegistry {
    const next = new ToolRegistry()
    for (const [key, value] of this.handlers.entries())
      next.handlers.set(key, value)
    next.handlers.set(name, handler)
    return next
  }

  has(name: string): boolean {
    return this.handlers.has(name)
  }

  async execute(name: string, input: unknown): Promise<ToolResult> {
    const handler = this.handlers.get(name)
    if (!handler) {
      return { status: 'failed', error: 'tool_not_found' }
    }
    return await handler(input)
  }
}
