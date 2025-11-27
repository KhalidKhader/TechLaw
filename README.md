# 🏛️ Law-Tech Platform

A comprehensive Law-Tech organization management system for universities, built with React, Material-UI, and Firebase Realtime Database.

![React](https://img.shields.io/badge/React-18.2-blue)
![Material-UI](https://img.shields.io/badge/Material--UI-5.14-blue)
![Firebase](https://img.shields.io/badge/Firebase-10.7-orange)
![License](https://img.shields.io/badge/License-Private-red)

## 🌟 Features

### Core Functionality
- ✅ **4-Level Authentication System** (Viewer, User, Admin, Super Admin)
- ✅ **User Profile Management** (Education, Experience, Skills, Bio)
- ✅ **Task Management** with assignment and status tracking
- ✅ **Ideas & Innovation Module** with approval workflow
- ✅ **Calendar System** (Personal + Global events)
- ✅ **Real-time Messaging** between users and admins
- ✅ **Admin Dashboard** with user management
- ✅ **Role-Based Access Control** (RBAC)

### Design & UX
- 🎨 **Professional Law-Tech Theme** (Navy & Gold palette)
- 🌓 **Dark/Light Mode** with smooth transitions
- 🌍 **Bilingual Support** (English & Arabic with RTL)
- 📱 **Fully Responsive** (Mobile, Tablet, Desktop)
- ⚡ **Real-time Updates** via Firebase

## �� Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

Visit [QUICK_START.md](./QUICK_START.md) for detailed setup instructions.

## 📂 Project Structure

```
bzu_law_tech/
├── public/                 # Static files
│   ├── _headers           # Security headers
│   └── _redirects         # SPA routing
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── Navbar.js
│   │   └── ProtectedRoute.js
│   ├── pages/            # Application pages
│   │   ├── DashboardPage.js
│   │   ├── ProfilePage.js
│   │   ├── CalendarPage.js
│   │   ├── IdeasPage.js
│   │   ├── TasksPage.js
│   │   ├── MessagesPage.js
│   │   ├── SettingsPage.js
│   │   └── admin/
│   │       └── UserManagementPage.js
│   ├── context/          # React Context (State Management)
│   │   ├── AuthContext.js
│   │   ├── ThemeContext.js
│   │   └── LanguageContext.js
│   ├── services/         # Firebase interaction logic
│   │   ├── authService.js
│   │   └── databaseService.js
│   ├── config/           # Configuration files
│   │   └── firebase.js
│   ├── styles/           # Theme configuration
│   │   └── theme.js
│   ├── i18n/             # Internationalization
│   │   └── locales/
│   │       ├── en.json
│   │       └── ar.json
│   └── App.js            # Main application component
├── firebase.rules.json   # Firebase security rules
├── netlify.toml          # Netlify configuration
├── .env.production       # Production environment variables
├── FEATURES.md           # Complete feature documentation
├── QUICK_START.md        # Setup guide
└── DEPLOYMENT.md         # Deployment instructions

```

## 🔐 Security

- **Firebase Security Rules**: Comprehensive rules for all data models
- **Role-Based Access**: 4-level authorization system
- **Source Map Protection**: Disabled in production builds
- **Security Headers**: XSS, CSRF, and clickjacking protection
- **Environment Variables**: Secure credential management

## 🎯 User Roles

| Role | Capabilities |
|------|-------------|
| **Viewer** | Read-only access to public information |
| **User** | Submit ideas, manage tasks, personal calendar, messaging |
| **Admin** | User management, task creation, idea/event approval |
| **Super Admin** | Full system control, create admins, manage all users |

## �� Technology Stack

- **Frontend**: React 18.2, Material-UI 5.14
- **Backend**: Firebase Realtime Database
- **Authentication**: Firebase Auth
- **State Management**: React Context API
- **Routing**: React Router v6
- **Styling**: Emotion (CSS-in-JS)
- **i18n**: react-i18next
- **Notifications**: react-hot-toast

## 🌐 Firebase Configuration

Connected to: `https://first-project-f1915-default-rtdb.firebaseio.com/`

See [QUICK_START.md](./QUICK_START.md) for initial setup and admin account creation.

## 📱 Responsive Design

Optimized for:
- 📱 Mobile (320px - 768px)
- 📱 Tablet (768px - 1366px)
- 💻 Laptop (1366px - 1920px)
- 🖥️ Desktop (1920px+)

## 🚀 Deployment

This project is configured for **Netlify** deployment with:
- Automatic SPA routing
- Security headers
- Source map protection
- Environment variable management

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment guide.

## 📚 Documentation

- **[FEATURES.md](./FEATURES.md)** - Complete feature list and data structure
- **[QUICK_START.md](./QUICK_START.md)** - Setup and user guide
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment instructions

## �� Theme Customization

The application uses a professional Law-Tech color palette:

**Light Mode**:
- Primary: Deep Navy (#1A365D)
- Secondary: Legal Gold (#C5A059)
- Background: Slate White (#F7FAFC)

**Dark Mode**:
- Primary: Navy Blue (#3182CE)
- Secondary: Gold (#C5A059)
- Background: Deep Navy (#0A1929)

Customize in `src/styles/theme.js`

## 🔧 Configuration

### Environment Variables
Create `.env.local` for development:
```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_DATABASE_URL=your_database_url
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## 🤝 Contributing

This is a private university project. For internal contributions:
1. Create a feature branch
2. Make your changes
3. Submit for review
4. Merge after approval

## 📄 License

Private - For Birzeit University Law-Tech Organization Use Only

## 🆘 Support

For issues or questions:
1. Check the documentation files
2. Review Firebase Console for data issues
3. Check browser console for error messages
4. Contact the development team

---

**Built with ❤️ for Birzeit University Law-Tech Organization**
# TechLaw
