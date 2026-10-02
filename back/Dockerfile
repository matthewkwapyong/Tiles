# ---- Stage 1: build ----
FROM rust:latest AS builder

WORKDIR /app

# Copy manifests first so dependency compilation gets cached
# separately from your actual source code changes
COPY Cargo.toml Cargo.lock ./

# Build a dummy main to cache dependencies in their own layer
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

# Now copy real source and build for real
COPY . .
RUN touch src/main.rs
RUN cargo build --release

# ---- Stage 2: runtime ----
FROM debian:bookworm-slim

# Needed for TLS (your DB connection, TMDB calls) and CA certs
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/back ./app

EXPOSE 8000
CMD ["./app"]
