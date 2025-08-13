# BMad "*" Quick Router - Usage Guide

## 🚀 **Setup Complete!**

The "*" shortcut is now available for instant BMad task routing.

## 📋 **Usage**

```bash
* "your task description"
```

The output gives you the exact command to copy into BMad chat.

## 🎯 **Examples**

```bash
# Development tasks
* "fix the search overlay"                 → *agent dev
* "debug the authentication bug"           → *agent dev
* "update the UI component"                → *agent dev

# Architecture tasks  
* "design the database schema"             → *agent architect
* "plan the microservices architecture"    → *agent architect

# Project management
* "create project timeline"                → *agent pm
* "plan the sprint"                        → *agent pm

# Quality assurance
* "create test plan"                       → *agent qa
* "validate the user flow"                 → *agent qa

# UX design
* "improve user experience"                → *agent ux-expert
* "design the interface"                   → *agent ux-expert

# Requirements
* "gather requirements for login"          → *agent po
* "define acceptance criteria"             → *agent po
```

## ⚡ **Workflow**

1. **Route the task:**
   ```bash
   * "fix the search overlay on live TV page"
   ```

2. **Copy the output:**
   ```
   🎯 *agent dev
   ```

3. **Paste in BMad chat and describe your task:**
   ```
   *agent dev
   
   I need to fix the Live TV page search overlay. Currently it's using 
   SeamlessSearchOverlay but it should use RealTimeSearchGridOverlay 
   like the main app does.
   ```

## 🔧 **Setup PATH (if needed)**

If the global "*" command doesn't work, add this to your shell config:

```bash
# Add to ~/.bashrc, ~/.zshrc, or ~/.bash_profile
export PATH="$HOME/bin:$PATH"
```

Then restart your terminal or run:
```bash
source ~/.bashrc  # or ~/.zshrc
```

## 🧪 **Available Agents**

| Agent | Specializes In |
|-------|----------------|
| `dev` | Code implementation, debugging, UI fixes |
| `architect` | System design, architecture patterns |
| `pm` | Project planning, timeline management |
| `qa` | Testing strategies, quality validation |
| `ux-expert` | User experience design, interface design |
| `po` | Requirements gathering, feature definition |
| `sm` | Sprint planning, agile workflows |
| `analyst` | Business analysis, research |
| `bmad-orchestrator` | Multi-step coordination, unclear tasks |

---

**Pro Tip:** The "*" command analyzes your task description and automatically suggests the best specialist. Just copy the output command and paste it into BMad! 🎉
