# Walkthrough

The LingoFlow project has been moved from its original prototyping location to the official **Opencode** workspace. This transition marks the project's evolution into a more structured development environment with dedicated agentic support.

## Key Changes
- **Directory**: The project now resides at `C:\Users\famil\Documents\Opencode\Lingoflow`.
- **Guidelines**: The project now follows the standard Opencode `AGENTS.md` conventions, including TypeScript strictness and Prettier formatting.
- **AI Model**: Hardcoded to `gemini-2.5-flash` for consistent, high-performance language tutoring.

## How to Proceed
1. **Open the Project**: Use `File > Open Folder` to open the new location.
2. **Setup Dependencies**: Run `npm install` in the new location once opened.
3. **Agent Interaction**: The `.agent/` directory now tracks tasks and project context locally, ensuring that any future agent (including me in a new session) can pick up exactly where we left off.
