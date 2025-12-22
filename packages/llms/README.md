# @page-agent/llms

LLM client with a **reflection-before-action** mental model for page-agent.

## Why This Package Exists

The LLM module and the agent logic are inherently coupled. This package exists not to decouple them, but to **define the interface contract** between the LLM and the agent.

The core abstraction is the `MacroToolInput` — a structured output format that **forces the model to reflect before acting**.

## The Reflection-Before-Action Model

Every tool call must first output its reasoning state before the actual action:

```typescript
interface MacroToolInput {
  // Reflection (mandatory before any action)
  evaluation_previous_goal?: string  // How well did the previous action work?
  memory?: string                     // Key information to remember
  next_goal?: string                  // What to accomplish next

  // Action (the actual operation)
  action: Record<string, any>
}
```

This design ensures that:

1. **The model evaluates its previous action** before deciding the next step
2. **Working memory is explicitly maintained** across conversation turns
3. **Goals are clearly stated**, making the agent's reasoning transparent and debuggable

## Key Components

| Export | Description |
|--------|-------------|
| `LLM` | Main LLM client class with retry logic |
| `MacroToolInput` | The reflection-before-action input schema |
| `AgentBrain` | Agent's thinking state (eval, memory, goal) |
| `LLMConfig` | Configuration for LLM connection |
| `parseLLMConfig` | Parse and apply defaults to config |
