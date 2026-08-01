_:
    just -l

build-core:
    cd packages/core; bun run build

build-serde:
    cd packages/serde; bun run build
