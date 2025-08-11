# MCP (Model Context Protocol) Setup

This directory contains configuration and documentation for Serena MCP used in the MoviePine project.

## Installed Tools

### Coding Agent
- **Serena**: Semantic code analysis and planning toolkit (ANALYSIS ONLY - NO CODE WRITING)
  - **Status**: ✅ Configured for GitHub Copilot (Analysis Mode)
  - **Role**: Analysis, Exploration, Planning, Understanding
  - **Context**: `ide-assistant` with `planning` and `interactive` modes
  - **Languages**: TypeScript, JavaScript, Python, Go, Rust, C#, Ruby, Swift, Java, PHP, C/C++
  - **Excludes**: Code writing, file editing, code generation

## Configuration Files

- `.vscode/settings.json` - VS Code workspace settings for Serena MCP
- `SERENA_SETUP.md` - General Serena documentation and setup options

## Setup Scripts

- `setup-serena.sh` - General Serena setup script
- `verify-serena.sh` - Verification script for Serena installation

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

