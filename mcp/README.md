# MCP (Model Context Protocol) Setup

This directory contains configuration and documentation for MCP tools used in the MoviePine project.

## Installed Tools

### Reasoning Tools
- **Atom of Thought (AoT)**: Structured problem decomposition with premise → reasoning → hypothesis → verification → conclusion workflow
- **Sequential Thinking**: Lightweight iterative chain-of-thought with revision and branching support

### Documentation Tools  
- **Context7**: Fetch focused, up-to-date library documentation for Next.js, React, Tailwind, etc.

### Coding Agent
- **Serena**: Semantic code analysis and planning toolkit (ANALYSIS ONLY - NO CODE WRITING)
  - **Status**: ✅ Configured for GitHub Copilot (Analysis Mode)
  - **Role**: Analysis, Exploration, Planning, Understanding
  - **Context**: `ide-assistant` with `planning` and `interactive` modes
  - **Languages**: TypeScript, JavaScript, Python, Go, Rust, C#, Ruby, Swift, Java, PHP, C/C++
  - **Excludes**: Code writing, file editing, code generation

## Configuration Files

- `mcp.config.json` - Main MCP tools registry
- `.vscode/settings.json` - VS Code workspace settings for Serena MCP
- `GITHUB_COPILOT_SETUP.md` - Detailed setup guide for GitHub Copilot integration
- `SERENA_SETUP.md` - General Serena documentation and setup options

## Setup Scripts

- `setup-github-copilot.sh` - Automated setup for GitHub Copilot integration ✅
- `setup-serena.sh` - General Serena setup script
- `verify-serena.sh` - Verification script for Serena installation

## Usage

## Usage

### Optimal Workflow: Analysis + Implementation

**Step 1: Analysis & Planning (Use Serena)**
```
Use Serena to analyze the project structure
With Serena, find all React components related to video playback  
Serena, show me how the movie data flows through the app
Use Serena to understand the existing search patterns
```

**Step 2: Code Implementation (Use GitHub Copilot)**
```
Generate a new React component for movie ratings
Implement the search functionality using the existing patterns
Create TypeScript interfaces for the movie data structure
Refactor this component to use the hook pattern I found
```

### GitHub Copilot Integration
Serena is configured to work with GitHub Copilot through the Copilot MCP extension in analysis-only mode.

### Legacy Tool Usage (AoT, Sequential Thinking, Context7)
| Tool | Purpose | When to Use | Skip When |
|------|---------|------------|-----------|
| atom-of-thought | Deep structured reasoning (premises → reasoning → hypotheses → verification → conclusions) | Large refactors, architecture choices, risk analysis | Simple cosmetic changes |
| sequential-thinking | Fast iterative reasoning with ability to revise earlier steps | Medium complexity feature design, exploratory ideation | Ultra-trivial tasks |
| context7 | Pull authoritative, version-aware library docs snippets | Need precise Next.js/React/Tailwind feature details | Knowledge already certain |

### Available Commands (Command Palette)
- `Copilot MCP: List Servers`
- `Copilot MCP: Restart Server` 
- `Copilot MCP: View Logs`

## Serena Capabilities (Analysis Only)

### Code Analysis & Exploration
- Symbol search and navigation across the entire codebase
- Reference finding to understand how components are used  
- File and directory structure overview and mapping
- Pattern matching and advanced search capabilities
- Dependency analysis and relationship mapping

### Planning & Strategy
- Architecture understanding and documentation
- Component hierarchy analysis
- Data flow mapping and visualization  
- Pattern identification for consistent implementation
- Memory system for project context and learnings

### What Serena Does NOT Do
❌ **Code Generation** - Leave this to GitHub Copilot  
❌ **File Editing** - GitHub Copilot handles modifications  
❌ **Code Writing** - Analysis and understanding only  
❌ **Refactoring** - Planning only, implementation via Copilot

### Language Server Integration
- TypeScript/JavaScript semantic analysis
- Go to definition, find references
- Symbol completion and validation
- Multi-language support

## Project Status

- ✅ Serena MCP installed and configured
- ✅ VS Code workspace settings configured
- ✅ GitHub Copilot integration active
- ✅ TypeScript language server initialized
- ✅ Project indexed and activated

## Decision Log Workflow (Suggested)
1. Initiate AoT or Sequential session for major decisions
2. After conclusion, copy summary into `docs/decisions/DECISION-<date>-<slug>.md` 
3. Reference decision file in PR description

## Resources

- [Serena GitHub Repository](https://github.com/oraios/serena)
- [MCP Documentation](https://modelcontextprotocol.io/)
- [Copilot MCP Extension](https://marketplace.visualstudio.com/items?itemName=automatalabs.copilot-mcp)

---
**Note**: The `mcp` directory contains configuration only and does not affect runtime or builds.

