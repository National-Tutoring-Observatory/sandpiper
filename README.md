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

## License

Sandpiper is open source. Ownership and licensing follow contribution:

- Code contributed by FreshCognate is owned by FreshCognate and licensed
  under the Apache License 2.0 (see [LICENSE](LICENSE)).
- Code contributed by Cornell University is owned by Cornell University and
  licensed under the MIT License (see [LICENSE-MIT](LICENSE-MIT)).

As of this change, all code in this repository is FreshCognate-contributed
and therefore licensed under Apache 2.0. Releases up to and including
v0.20.0 were published under the MIT License and remain so.
