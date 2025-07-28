# TimePilot 🚀

**Intelligent Study Planning and Time Management App**

TimePilot is a sophisticated study planning application that uses intelligent algorithms to help you manage your time effectively, prioritize tasks, and maintain a balanced study schedule.

## ✨ Features

### 🎯 Smart Task Management
- **Intelligent Task Estimation**: Built-in estimation helper for different task types
- **Priority-Based Scheduling**: Automatically prioritizes important and urgent tasks
- **Deadline Awareness**: Smart scheduling that respects your deadlines
- **Task Categories**: Organize tasks by subject, type, and impact level

### 📅 Advanced Study Planning
- **Intelligent Scheduling**: AI-powered algorithms that distribute study hours optimally
- **Multiple Distribution Modes**: 
  - **Even**: Balanced distribution across available time
  - **Pressure**: Front-loads urgent tasks for deadline-driven study
- **Conflict Resolution**: Automatically handles scheduling conflicts with fixed commitments
- **Session Optimization**: Minimizes session splitting and maximizes study efficiency

### ⏰ Smart Timer System
- **Session Tracking**: Track actual time spent vs. estimated time
- **Progress Monitoring**: Real-time progress updates and completion tracking
- **Break Management**: Integrated break suggestions and timing
- **Session Completion**: Mark sessions as done with detailed progress tracking

### 📊 Comprehensive Dashboard
- **Progress Overview**: Visual representation of study progress
- **Task Analytics**: Detailed insights into your study patterns
- **Completion Tracking**: Track completed sessions and overall progress
- **Smart Notifications**: Helpful reminders and optimization suggestions

### 🎨 User Experience
- **Dark Mode**: Comfortable study experience in any lighting
- **Interactive Tutorial**: Guided onboarding for new users
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Local Storage**: Your data stays private and secure

### 🔧 Flexible Settings
- **Study Window**: Customize your preferred study hours
- **Work Days**: Set your available study days
- **Break Preferences**: Configure short and long break durations
- **Notification Settings**: Control study reminders and alerts

## 🚀 Quick Start

### Prerequisites
- Node.js 16.0.0 or higher
- npm 8.0.0 or higher

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/timepilot.git
   cd timepilot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment.

## 📖 Usage Guide

### Getting Started

1. **Add Your Tasks**
   - Click the "Tasks" tab
   - Use the "Add Task" button to create new tasks
   - Fill in task details including estimated hours and deadline
   - Use the estimation helper for accurate time estimates

2. **Set Up Your Schedule**
   - Go to "Settings" to configure your study preferences
   - Add fixed commitments (classes, work, appointments) in the "Commitments" tab
   - Set your daily available study hours and work days

3. **Generate Your Study Plan**
   - Navigate to the "Study Plan" tab
   - Click "Generate Study Plan" to create your optimized schedule
   - Review the suggested distribution and make adjustments if needed

4. **Start Studying**
   - Use the timer to track your study sessions
   - Mark sessions as complete when finished
   - Monitor your progress in the dashboard

### Key Features Explained

#### Task Estimation Helper
TimePilot includes a smart estimation system that helps you accurately estimate task duration based on:
- **Task Type**: Writing, Learning, Research, etc.
- **Complexity Level**: Simple to complex topics
- **Additional Factors**: Research needs, multiple drafts, practice problems

#### Study Plan Modes
- **Even Mode**: Distributes study hours evenly across available time
- **Pressure Mode**: Front-loads urgent tasks for deadline-driven study patterns

#### Session Management
- **Automatic Session Combining**: Minimizes session splitting for better focus
- **Conflict Resolution**: Automatically handles scheduling conflicts
- **Missed Session Handling**: Smart redistribution of missed sessions

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript type checking

### Project Structure

```
src/
├── components/          # React components
├── utils/              # Utility functions
├── types.ts            # TypeScript type definitions
├── App.tsx             # Main application component
└── main.tsx            # Application entry point
```

### Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **React Big Calendar** - Calendar component
- **Recharts** - Data visualization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-username/timepilot/issues) page
2. Create a new issue with detailed information
3. Include your browser version and operating system

## 🎯 Roadmap

- [ ] PWA support for mobile app experience
- [ ] Data export/import functionality
- [ ] Cloud sync for cross-device access
- [ ] Advanced analytics and insights
- [ ] Integration with calendar apps
- [ ] Study group features

---

**Made with ❤️ for students and learners everywhere**

*TimePilot - Your intelligent study companion*
