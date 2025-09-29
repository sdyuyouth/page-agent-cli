# Contributing to Page-Agent

Thank you for your interest in contributing to Page-Agent! We welcome contributions from everyone.

## 🚀 Quick Start

### Development Setup

1. **Prerequisites**
   - Node.js 20+
   - npm

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Development Commands**
   ```bash
   npm run dev          # Start documentation site
   npm run build:lib:watch  # Library development with auto-rebuild
   npm run lint         # Run linting
   ```

### Project Structure

This project has **two separate parts**:

- **Core Library** (`src/`) - Pure JavaScript AI agent library
- **Documentation Website** (`pages/`) - React web app for landing page and docs

## 🤝 How to Contribute

### Reporting Issues

- Use the GitHub issue tracker to report bugs or request features
- Search existing issues before creating new ones
- Provide clear reproduction steps for bugs
- Include browser version and environment details

### Code Contributions

1. **Fork and Clone**
   ```bash
   git fork https://github.com/your-username/page-agent
   git clone https://github.com/your-username/page-agent.git
   cd page-agent
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Follow existing code style and patterns
   - Add tests for new functionality
   - Update documentation as needed

4. **Test Your Changes**
   ```bash
   npm run lint
   npm run build
   npm run build:lib
   ```

5. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: add awesome feature"
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**
   - Provide clear description of changes
   - Link related issues
   - Include screenshots for UI changes

## 📝 Code Style

### General Guidelines

- Use TypeScript for type safety
- Follow existing naming conventions
- Write meaningful commit messages
- Keep functions small and focused
- Add JSDoc comments for public APIs

### Core Library (`src/`)

- **No React dependencies** - Pure JavaScript/TypeScript only
- Use event bus for component communication
- Follow browser-use patterns for DOM operations
- Maintain compatibility with CDN injection

### Documentation Site (`pages/`)

- Use React 19 + TypeScript
- Follow hash routing patterns (`useHashLocation`)
- Use Tailwind CSS for styling
- Add new docs pages to both router and sidebar

## 🔧 Development Workflows

### Library Development

```bash
npm run build:lib:watch    # Auto-rebuild on changes
# Test via: <script src="dist/lib/page-agent.umd.js"></script>
```

### Website Development

```bash
npm run dev                # React development server
# Import from src/ via @/ alias to demo library features
```

### Adding Documentation

1. Create `pages/docs/section/page-name/page.tsx`
2. Add route to `pages/router.tsx`
3. Add navigation link to `pages/components/DocsLayout.tsx`

## 🎯 Contribution Areas

We especially welcome contributions in:

- **Browser compatibility** improvements
- **Performance optimizations** for DOM processing
- **Documentation** and examples
- **Testing** and quality assurance
- **Accessibility** features
- **Internationalization** support

## 🚫 What We Don't Accept

- Changes that break existing API compatibility
- Features that add React dependencies to core library
- Contributions without proper testing
- Code that doesn't follow project conventions

## 📄 Legal

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

### Browser-Use Attribution

Parts of this project are derived from the [browser-use](https://github.com/browser-use/browser-use) project (MIT License). When contributing to DOM-related functionality:

- Maintain existing attribution comments
- Follow similar patterns for consistency
- Credit browser-use for derived concepts

## 💬 Questions?

- Open a GitHub issue for technical questions
- Check existing documentation and issues first
- Be respectful and constructive in discussions

Thank you for helping make Page-Agent better! 🎉
