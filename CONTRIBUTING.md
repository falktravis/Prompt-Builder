# Contributing to Prompt Builder 👋

We welcome contributions from the community! Whether you're fixing bugs, proposing new features, or improving documentation, your help makes this project better for everyone.

---

## **Development Setup** 💻

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)
- Google Chrome (for testing the extension)

### Installation
1. Fork and clone the repository:
   - $git clone https://github.com/falktravis/prompt-builder.git
   - $cd prompt-builder

Install dependencies:
  - $npm install

Start the development server:
  - $npm run dev

Build the Chrome extension (produces dist folder):
  - $npm run build

## Coding Standards 📜
- Follow TypeScript best practices (strict typing, avoid any)
- Use SCSS modules for styling (no inline CSS)
- Prefer functional React components with hooks

## Submitting Changes 🔄
Create a new branch:
  - $git checkout -b feat/your-feature-name _or_ $git checkout -b fix/your-bug-fix

Commit your changes with a descriptive message:
  - $git commit -m "feat: add undo/redo functionality"

Push to your fork:
  - $git push origin your-branch-name

Open a Pull Request against the main branch:
  - Include a clear description of your changes
  - Reference related GitHub issues (e.g., "Closes #12")
  - Keep commits squashed where appropriate

## Feature Requests & Bugs 🐛
Found a bug or have an idea? Open a GitHub Issue with:
- A descriptive title
- Detailed description (include steps to reproduce for bugs)
- Expected vs actual behavior
- Screenshots/GIFs (if relevant)
- Browser/OS version
