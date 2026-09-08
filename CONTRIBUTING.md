# Contributing to MDPOWER

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
# Install Bun (if not installed)
curl -fsSL https://bun.sh/install | bash

# Clone the repo
git clone https://github.com/yourusername/MDPOWER.git
cd MDPOWER

# Install dependencies
bun install

# Start development with HMR
bun run dev:hmr
```

## Project Structure

```
src/
├── bun/           # Main process (Electrobun/Bun runtime)
├── mainview/      # React UI (components, styles)
└── shared/        # Shared types between main and renderer
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Dev without HMR |
| `bun run dev:hmr` | Dev with hot module replacement |
| `bun run build` | Production build |
| `bun run build:canary` | Canary build |
| `bun run build:installer` | Build + Windows installer |

## Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## Code Style

- TypeScript for all code
- React functional components with hooks
- Tailwind CSS for styling
- Follow existing patterns in the codebase

## Reporting Issues

- Use GitHub Issues
- Include OS, Electrobun version, and steps to reproduce
- Screenshots welcome

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
