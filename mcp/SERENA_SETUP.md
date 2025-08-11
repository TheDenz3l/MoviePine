# Serena MCP Installation Guide

## Overview
Serena is a powerful coding agent toolkit that provides semantic code retrieval and editing capabilities through the Model Context Protocol (MCP). It uses language servers to understand code structure and relationships.

## Installation

### Prerequisites
- `uvx` installed (comes with uv)
- For local installation: Python 3.8+ and uv

### Quick Installation (Recommended)
Serena is installed using `uvx` and doesn't require local setup:

```bash
uvx --from git+https://github.com/oraios/serena serena --help
```

## VS Code Configuration (Recommended)

Serena works excellently with VS Code through MCP-compatible extensions. Here are the recommended approaches:

### Option 1: Cline Extension (Recommended)
Cline is already installed and supports MCP servers natively.

**Configuration:**
1. Open Cline extension settings in VS Code
2. Navigate to MCP Servers configuration
3. Add Serena MCP server:

```json
{
  "serena": {
    "command": "uvx",
    "args": [
      "--from", 
      "git+https://github.com/oraios/serena", 
      "serena", 
      "start-mcp-server",
      "--context",
      "ide-assistant",
      "--project",
      "/Users/bmar/Documents/movieplayer"
    ]
  }
}
```

### Option 2: Copilot MCP Extension
For GitHub Copilot users, install the Copilot MCP extension:

```vscode-extensions
automatalabs.copilot-mcp
```

### Option 3: Direct MCP Client
Install a dedicated MCP client extension:

```vscode-extensions
m1self.mcp-client
```

## Claude Desktop Configuration (Alternative)

If you prefer Claude Desktop, edit your `claude_desktop_config.json` file:

**Location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`

**Configuration:**
```json
{
  "mcpServers": {
    "serena": {
      "command": "uvx",
      "args": [
        "--from", 
        "git+https://github.com/oraios/serena", 
        "serena", 
        "start-mcp-server",
        "--context",
        "ide-assistant",
        "--project",
        "/Users/bmar/Documents/movieplayer"
      ]
    }
  }
}
```

**Important Notes:**
- Replace `/Users/bmar/Documents/movieplayer` with your actual project path
- Use absolute paths to avoid configuration issues
- On Windows, escape backslashes with `\\` or use forward slashes
- Fully quit Claude Desktop (not just close) and restart after configuration changes

## Contexts Available

- `desktop-app`: Default context for Claude Desktop
- `ide-assistant`: Optimized for IDE integration (recommended for this project)
- `agent`: For autonomous agent scenarios

## Features

### Language Support
- **Primary:** TypeScript, JavaScript, Python, Go, Rust
- **Additional:** C#, Ruby, Swift, Java, PHP, C/C++, Elixir, Clojure, Bash

### Key Capabilities
- Semantic code search and navigation
- Symbol-level code editing
- Project structure analysis
- Language server integration
- Memory system for project context
- Shell command execution
- Git integration

### Tools Available
- `activate_project`: Project activation and indexing
- `find_symbol`: Global symbol search
- `get_symbols_overview`: File structure overview
- `read_file`: Smart file reading
- `replace_symbol_body`: Precise code editing
- `execute_shell_command`: Shell execution
- `create_text_file`: File creation
- `search_for_pattern`: Project-wide search
- And many more...

## Project Setup

### First Time Setup
1. Activate your project:
   ```
   "Activate the project /Users/bmar/Documents/movieplayer"
   ```

2. For large projects, index for better performance:
   ```bash
   uvx --from git+https://github.com/oraios/serena serena project index
   ```

### Project Structure
Serena works best with:
- Well-structured, modular code
- Type annotations (for dynamically typed languages)
- Clean git state
- Good test coverage
- Meaningful logging

## Usage Tips

1. **Start Clean**: Begin tasks from a clean git state
2. **Use Onboarding**: Let Serena learn your project structure
3. **Leverage Memories**: Serena stores project context for future sessions
4. **Symbol-Level Editing**: Use semantic operations instead of line-based edits
5. **Context Management**: Switch conversations for long tasks to avoid token limits

## Dashboard
Serena provides a web dashboard at `http://localhost:24282/dashboard/index.html` for:
- Viewing logs
- Monitoring tool usage
- Shutting down the server

## Troubleshooting

### Common Issues
1. **Permission Errors**: Use absolute paths in configuration
2. **Language Server Issues**: Restart with the `restart_language_server` tool
3. **Zombie Processes**: Use the dashboard to properly shut down servers
4. **Context Limits**: Create summaries and continue in new conversations

### Verification
Test installation:
```bash
uvx --from git+https://github.com/oraios/serena serena start-mcp-server --help
```

## Resources
- [GitHub Repository](https://github.com/oraios/serena)
- [Documentation](https://github.com/oraios/serena#readme)
- [Issues & Support](https://github.com/oraios/serena/issues)
