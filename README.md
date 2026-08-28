[![API Healthcheck](https://github.com/National-Tutoring-Observatory/sandpiper/actions/workflows/api-healthcheck.yml/badge.svg)](https://github.com/National-Tutoring-Observatory/sandpiper/actions/workflows/api-healthcheck.yml)

## Getting Started

Make sure you have followed the "Setup: Prerequisites" here: https://github.com/National-Tutoring-Observatory/RnD. You will need Node.js and Yarn.js installed first.

### Installation

Install the dependencies:

```bash
yarn
```

### Development

You'll need to set up your .env file.

```bash
cp .env.example .env
```

Start the development server with HMR:

```bash
yarn app:dev
```

Your application will be available at `http://localhost:5173`.

For Docker Compose setups, production-like containers, or configuring Google Cloud (GCS storage, Vertex AI) or AWS backends, see [CONTRIBUTING.md](CONTRIBUTING.md).
