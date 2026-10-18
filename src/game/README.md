# Game module structure

Task 4 begins the approved gameplay implementation while preserving these boundaries.

```text
src/game/
├── application/       # Use cases, game-flow coordinator, commands and events
├── config/            # Typed balance, viewport, map and accessibility settings
├── content/           # Data-only aircraft, airport, map and upgrade definitions
├── domain/
│   ├── components/    # ECS-style data components with no Phaser imports
│   ├── systems/       # Fixed-step simulation systems with no Phaser imports
│   └── value-objects/ # Routes, headings, fuel, money and identifiers
├── infrastructure/    # Save adapter, migrations, PWA updates and telemetry facade
├── presentation/
│   ├── scenes/        # Thin Phaser scenes
│   ├── renderers/     # Entity-to-GameObject synchronization and pooling
│   └── ui/            # Touch console, strips, dialogs and safe-area layout
└── shared/            # Math, spatial hash, event bus, RNG and assertions
```

The domain layer owns authoritative state. Phaser is an adapter for rendering and pointer input, not the source of gameplay truth.
