# AI 2027 Tabletop Exercise

A simulation and visualization tool for projecting hypothetical AI development progress across different organizations in a 2027-2028 timeline.

> **Note:** This app was converted from a Tauri desktop application to a web application. The core functionality remains the same, but it now runs in a browser instead of as a desktop app.

## Features

- Interactive data table for managing AI development progress metrics
- Logarithmic scale visualization of AI progress over time
- Save and load data from JSON files
- Automatic data persistence using browser localStorage
- Responsive design with dark/light mode support

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install
# or with pnpm
pnpm install
```

### Development

```bash
# Start the development server
npm run dev
# or with pnpm
pnpm dev
```

The application will be available at http://localhost:3000

### Building for Production

```bash
# Build the application
npm run build
# or with pnpm
pnpm build

# Preview the production build
npm run preview
# or with pnpm
pnpm preview
```

## Usage

1. Navigate to the "Data Editor" tab to manage your AI progress data
2. Add columns to represent different AI labs/organizations
3. Add rows to represent different time periods
4. Update the values to represent AI capability multipliers
5. Use the "Chart View" tab to visualize the progress over time
6. Save your data using the "Save" button to download as JSON
7. Load previously saved data using the "Load" button

## License

This project is open source and available under the MIT License.