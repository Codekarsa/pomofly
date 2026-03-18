# PomoFly 🍅

PomoFly is a modern productivity application that combines the Pomodoro Technique with intelligent task management to help users boost their productivity and manage their time effectively.

## Features

✅ **Core Functionality**
- Advanced Pomodoro timer with customizable intervals
- Comprehensive task management system  
- Project organization and tracking
- Real-time data synchronization across devices
- Responsive design optimized for desktop and mobile

✅ **Productivity Features**
- Task breakdown and time estimation
- Progress tracking and statistics
- Focus session management
- Break reminders and guidance

✅ **Security & Reliability**
- Secure user authentication with Firebase Auth
- Automated dependency vulnerability scanning
- Regular security updates via Dependabot
- Comprehensive error handling and monitoring

## Technologies Used

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Firebase (Authentication, Firestore, Hosting)
- **Styling**: Tailwind CSS, shadcn/ui components
- **Testing**: Jest, React Testing Library
- **Security**: Dependabot, npm audit, automated vulnerability scanning

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Firebase account

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/pomofly.git
   cd pomofly
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory and add your Firebase configuration:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. Run the development server:
   ```
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Available Scripts

### Development
- `yarn dev` - Start development server
- `yarn build` - Build for production  
- `yarn start` - Start production server
- `yarn lint` - Run ESLint

### Testing
- `yarn test` - Run test suite
- `yarn test:watch` - Run tests in watch mode
- `yarn test:coverage` - Generate test coverage report

### Security
- `yarn audit` - Check for dependency vulnerabilities
- `yarn audit:fix` - Auto-fix vulnerabilities when possible
- `yarn security:check` - Check for moderate+ severity vulnerabilities
- `yarn security:full-check` - Run comprehensive security validation
- `yarn security:report` - Generate detailed security report

### Productivity Tools
- `yarn pwa:test` - Run Lighthouse audit on production site
- `yarn beads` - Check issue tracking status

## Security

PomoFly takes security seriously and implements multiple layers of protection:

🔒 **Automated Security Monitoring**
- **Dependabot**: Weekly automated security updates for dependencies
- **Vulnerability Scanning**: npm audit integration with CI/CD pipeline  
- **Security Reporting**: Comprehensive security validation tools

🛡️ **Data Protection**
- Secure authentication via Firebase Auth
- Real-time security rules for Firestore
- Environment variable configuration for sensitive data
- Regular security audits and updates

⚠️ **Vulnerability Reporting**
If you discover a security vulnerability, please see our [Security Policy](SECURITY.md) for responsible disclosure procedures.

## Deployment

This project is configured for deployment on Firebase Hosting:

1. **Prepare for deployment:**
   ```bash
   yarn security:check  # Verify no security issues
   yarn test           # Ensure all tests pass
   yarn build          # Build production bundle
   ```

2. **Deploy to Firebase:**
   ```bash
   yarn deploy
   ```

3. **Monitor deployment:**
   - Check Firebase Console for deployment status
   - Verify application functionality in production
   - Review any deployment warnings or errors

## Development Workflow

### Before Contributing
1. **Security check**: Run `yarn security:full-check`
2. **Install dependencies**: `yarn install`  
3. **Run tests**: `yarn test`
4. **Start dev server**: `yarn dev`

### Before Submitting PRs
1. **Code quality**: Ensure `yarn lint` passes
2. **Testing**: Add tests for new features, ensure `yarn test` passes
3. **Security**: Run `yarn security:check` and fix any issues
4. **Documentation**: Update README.md if adding new features

## Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Follow our development workflow** (see above)
4. **Commit your changes**: `git commit -m 'feat: add amazing feature'`
5. **Push to the branch**: `git push origin feature/amazing-feature`  
6. **Open a Pull Request**

### Contribution Guidelines
- Follow existing code style and conventions
- Add tests for new functionality
- Update documentation as needed
- Keep PRs focused and atomic
- Write clear, descriptive commit messages

## Project Status

🚀 **Active Development** - PomoFly is actively maintained and regularly updated with new features and security improvements.

📊 **Current Status**:
- ✅ Core functionality complete
- ✅ Security monitoring implemented  
- ✅ Comprehensive testing setup
- 🔄 Continuous improvement via GitHub Issues
- 🔄 Regular dependency updates via Dependabot

## Support

- 📖 **Documentation**: Check this README and inline code comments
- 🐛 **Bug Reports**: Open an issue on GitHub
- 💡 **Feature Requests**: Open an issue with the "enhancement" label
- 🔒 **Security Issues**: See [SECURITY.md](SECURITY.md) for responsible disclosure

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements

- **Frameworks**: [Next.js](https://nextjs.org/), [React](https://reactjs.org/)
- **Backend**: [Firebase](https://firebase.google.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/)
- **Testing**: [Jest](https://jestjs.io/), [React Testing Library](https://testing-library.com/)
- **Security**: [Dependabot](https://github.com/dependabot), [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)

---

Made with ❤️ for productivity enthusiasts. Happy focusing! 🍅
