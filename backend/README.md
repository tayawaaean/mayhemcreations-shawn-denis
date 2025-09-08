# Mayhem Creations Backend API

This is the backend API for the Mayhem Creations e-commerce platform, built with Express.js, TypeScript, and Sequelize.

## Features

- **Core Framework**: Express.js with TypeScript
- **Database**: MySQL with Sequelize ORM
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Security**: Helmet, CORS, rate limiting, input validation
- **File Uploads**: Multer with AWS S3 and Cloudinary support
- **Payment Processing**: Stripe and PayPal integration
- **Email Service**: Nodemailer for transactional emails
- **Caching**: Node-cache for in-memory caching
- **Search**: Elasticsearch integration
- **Background Jobs**: Bull queue for async processing
- **Monitoring**: Sentry for error tracking, Prometheus metrics
- **Testing**: Jest with Supertest for API testing

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp env.example .env
```

3. Update the `.env` file with your configuration values.

4. Build the project:
```bash
npm run build
```

5. Start the development server:
```bash
npm run dev
```

## Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with hot reload
- `npm run build` - Build the TypeScript project
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/          # Sequelize models
├── routes/          # API routes
├── services/        # Business logic services
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
└── tests/           # Test files
```

## Environment Variables

See `env.example` for all required environment variables.

## API Documentation

The API documentation will be available at `/api/docs` when the server is running.

## Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT
