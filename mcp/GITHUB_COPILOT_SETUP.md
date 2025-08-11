# Serena MCP Setup for GitHub Copilot in VS Code

## Overview
This guide helps you set up Serena MCP for use with GitHub Copilot in VS Code using the Copilot MCP extension.

## Prerequisites
- VS Code with GitHub Copilot extension
- Copilot MCP extension (installed)
- `uvx` (comes with uv)

## Setup Steps

### 1. Install Copilot MCP Extension
The Copilot MCP extension is already installed. This extension allows GitHub Copilot to connect to MCP servers.

### 2. Configure Serena MCP Server

Create or update your VS Code settings to include Serena MCP configuration:

**File:** `.vscode/settings.json` (workspace) or global VS Code settings

```json
{
  "copilot-mcp.mcpServers": {
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
      ],
      "description": "Serena semantic code toolkit for MoviePine project"
    }
  }
}
```

### 3. Alternative: Use Command Palette

1. Open Command Palette (`Cmd+Shift+P`)
2. Search for "Copilot MCP: Add Server"
3. Configure Serena with the above settings

### 4. Verify Installation

1. Open Command Palette (`Cmd+Shift+P`)
2. Search for "Copilot MCP: List Servers"
3. Verify Serena appears in the list

## Usage with GitHub Copilot

Once configured, you can use Serena tools through GitHub Copilot chat:

### Example Prompts:
- "Use Serena to show me the structure of the src directory"
- "With Serena, find all React components in this project"
- "Use Serena to analyze the dependencies of the MovieGrid component"
- "Find all TypeScript interfaces using Serena"

### Available Contexts:
- `ide-assistant`: Optimized for VS Code integration (recommended)
- `desktop-app`: General desktop application context
- `agent`: For autonomous operations

## Serena Capabilities

### Code Analysis
- **Symbol Search**: Find functions, classes, interfaces across the codebase
- **Reference Finding**: Locate all usages of a symbol
- **Structure Overview**: Get file and directory overviews
- **Pattern Search**: Project-wide pattern matching

### Code Editing
- **Symbol Replacement**: Replace entire functions/classes precisely
- **Regex Editing**: Fine-grained code modifications
- **Insertion**: Add code before/after symbols
- **Memory System**: Store and recall project context

### Project Tools
- **Project Activation**: Index and activate projects
- **Language Server Integration**: TypeScript, JavaScript, Python, Go, Rust, etc.
- **Git Integration**: Work with version control
- **Shell Execution**: Run commands when needed

## Language Support
- **Primary**: TypeScript, JavaScript, Python, Go, Rust
- **Additional**: C#, Ruby, Swift, Java, PHP, C/C++, Bash

## Configuration Tips

### For Large Projects
Enable indexing for better performance:
```bash
uvx --from git+https://github.com/oraios/serena serena project index
```

### Context Selection
- Use `ide-assistant` for VS Code integration
- Adjust based on your workflow needs

### Memory Management
Serena automatically creates memories for better context in future sessions.

## Troubleshooting

### Common Issues
1. **Server Not Starting**: Check that `uvx` is in PATH
2. **Tools Not Available**: Verify Copilot MCP extension is active
3. **Project Not Found**: Ensure absolute paths are used

### Verification Commands
```bash
# Test Serena installation
uvx --from git+https://github.com/oraios/serena serena --help

# Test MCP server
uvx --from git+https://github.com/oraios/serena serena start-mcp-server --help
```

### VS Code Commands
- `Copilot MCP: List Servers`
- `Copilot MCP: Restart Server`
- `Copilot MCP: View Logs`

## Integration Benefits

Using Serena with GitHub Copilot provides:
- **Semantic Understanding**: Language server-powered code analysis
- **Precise Editing**: Symbol-level modifications
- **Project Context**: Better understanding of codebase structure
- **Efficient Navigation**: Find and understand code relationships
- **Type-Aware Operations**: Leverage TypeScript/JavaScript type information

## Next Steps

1. Test the configuration with a simple command
2. Try analyzing your project structure
3. Explore Serena's semantic search capabilities
4. Use memory system for project-specific context

## Resources
- [Serena GitHub Repository](https://github.com/oraios/serena)
- [Copilot MCP Extension](https://marketplace.visualstudio.com/items?itemName=automatalabs.copilot-mcp)
- [MCP Documentation](https://modelcontextprotocol.io/)
