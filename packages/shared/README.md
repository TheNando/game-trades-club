# @game-trades-club/shared

Shared isomorphic library for the Game Trades Club application. This package contains common types, constants, validation logic, formatters, and utilities that are used by both the API (backend) and web (frontend) applications.

## Purpose

This package ensures:

- **Type Safety**: Shared TypeScript types guarantee API/frontend contract consistency
- **DRY Principle**: Single source of truth for business logic
- **Consistency**: Same validation, formatting, and labels across the entire application
- **Maintainability**: Changes propagate automatically to both apps

## Structure

```
packages/shared/
├── src/
│   ├── types/           # TypeScript type definitions
│   ├── constants/       # Shared constants and enums
│   ├── validation/      # Validation functions
│   ├── formatters/      # Display formatting utilities
│   └── utils/           # General utilities
```

## Usage

### In the API (apps/api)

```typescript
import { VALID_CONDITIONS } from '@game-trades-club/shared/constants';
import type { Listing, ListingFilters } from '@game-trades-club/shared/types';

// Use shared types for API responses
function getListings(filters: ListingFilters): Listing[] {
  // ...
}

// Use shared validation
if (!VALID_CONDITIONS.has(condition)) {
  return badRequest('Invalid condition');
}
```

### In the Web App (apps/web)

```typescript
import { formatPrice, formatCondition } from '@game-trades-club/shared/formatters';
import { validateListingImages } from '@game-trades-club/shared/validation';
import type { Listing, Shop } from '@game-trades-club/shared/types';

// Use shared formatters
<p>{formatPrice(listing.price)}</p>
<span>{formatCondition(listing.condition)}</span>

// Use shared validation
const validation = validateListingImages(files);
if (!validation.ok) {
  alert(validation.message);
}
```

## Exports

The package provides both a main export and sub-path exports:

```typescript
// Import everything
import { Listing, formatPrice, CONDITION_OPTIONS } from '@game-trades-club/shared';

// Or import from specific modules
import { Listing } from '@game-trades-club/shared/types';
import { formatPrice } from '@game-trades-club/shared/formatters';
import { CONDITION_OPTIONS } from '@game-trades-club/shared/constants';
```

## Development

This package is part of the monorepo workspace. Configuration is required in two places:

### TypeScript Configuration

Path mapping is configured in `tsconfig.base.json` to resolve `@game-trades-club/shared` imports:

```json
"paths": {
  "@game-trades-club/shared": ["./packages/shared/src/index.ts"],
  "@game-trades-club/shared/*": ["./packages/shared/src/*"]
}
```

### Vite Configuration (Web App)

Module resolution is configured in `apps/web/vite.config.ts`:

```typescript
resolve: {
  alias: {
    '@game-trades-club/shared/types': resolve(__dirname, '../../packages/shared/src/types'),
    '@game-trades-club/shared/constants': resolve(__dirname, '../../packages/shared/src/constants'),
    '@game-trades-club/shared/validation': resolve(__dirname, '../../packages/shared/src/validation'),
    '@game-trades-club/shared/formatters': resolve(__dirname, '../../packages/shared/src/formatters'),
    '@game-trades-club/shared/utils': resolve(__dirname, '../../packages/shared/src/utils'),
    '@game-trades-club/shared': resolve(__dirname, '../../packages/shared/src'),
  },
}
```

**Note**: Sub-path aliases must come before the main alias for proper resolution.

No build step is required - both apps import directly from the TypeScript source.

## Adding New Shared Code

When adding new shared functionality:

1. Determine the appropriate module (types, constants, validation, formatters, utils)
2. Add the code to the relevant file in `src/`
3. Export from the module's `index.ts`
4. Update this README if adding a new module
5. Run `bun run typecheck` to verify no type errors
6. Update consuming apps to use the shared code
