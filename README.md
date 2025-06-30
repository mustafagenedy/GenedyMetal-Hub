# Genedy Metal Web Application

## Overview
Genedy Metal is a full-stack web application for a premium aluminum solutions company based in Egypt. The platform provides a modern, responsive website for customers to explore products, view galleries, contact the company, and reserve visits. It also features a robust backend for user management, reservations, and message handling, with both English and Arabic language support.

---

## Table of Contents
- [Features](#features)
- [Project Structure](#project-structure)
- [Backend](#backend)
  - [API Endpoints](#api-endpoints)
  - [Database Models](#database-models)
- [Frontend](#frontend)
  - [Pages](#pages)
  - [Assets & Styling](#assets--styling)
  - [Multilingual Support](#multilingual-support)
- [Setup & Installation](#setup--installation)
- [Usage](#usage)
- [License](#license)

---

## Features
- Modern, responsive company website (English & Arabic)
- Product showcase (doors, windows, kitchens, frontages)
- Interactive gallery with lightbox
- Contact form with backend integration
- Reservation system for booking visits
- User authentication and dashboard
- Admin panel for managing users, reservations, and messages
- RESTful API (Express.js, MongoDB)
- Secure authentication (JWT, bcrypt)
- Form validation (Joi, frontend validation)

---

## Project Structure
```
GenedyMetal-Hub/
├── **Backend/**
│   ├── DB/
│   │   ├── dbConnection.js
│   │   └── Model/
│   │       ├── user.model.js
│   │       ├── message.model.js
│   │       └── reservation.model.js
│   ├── index.js
│   ├── package.json
│   └── SRC/
│       ├── Middleware/
│       └── Modules/
├── **Frontend/**
│   ├── HTML/
│   ├── HTML-AR/
│   ├── CSS/
│   ├── JS/
│   └── Assets/
```

---

## Backend
- **Framework:** Node.js (Express.js)
- **Database:** MongoDB (Mongoose ODM)
- **API:** RESTful, modular structure
- **Security:** JWT authentication, bcrypt password hashing, CORS
- **Validation:** Joi for request validation

### API Endpoints
- `/users` - User registration, login, profile, dashboard
- `/reservations` - Create, view, manage reservations
- `/messages` - Contact form messages, admin replies

### Database Models
- **User**
  - `fullName` (String, required)
  - `email` (String, required, unique)
  - `phone` (String, required)
  - `password` (String, required, hashed)
  - `role` (String: 'admin' or 'user', default: 'user')
  - Timestamps
- **Message**
  - `name`, `email`, `phone`, `message` (all required)
  - `status` (pending, read, replied)
  - Timestamps
- **Reservation**
  - `fullName`, `phone`, `email` (all required)
  - `visitType` (consultation, follow-up, emergency, routine, other)
  - `preferredDate`, `preferredTime`, `address`, `notes`
  - `status` (pending, confirmed, cancelled, completed)
  - Timestamps

---

## Frontend
- **Tech:** HTML5, CSS3, JavaScript (Vanilla), Bootstrap 5, Font Awesome
- **Structure:** Modular, with separate folders for HTML, CSS, JS, and assets
- **Features:**
  - Responsive navigation and sections (About, Products, Gallery, Contact)
  - Interactive gallery with filtering and lightbox
  - Contact form with real-time validation and backend integration
  - Reservation form and user dashboard
  - Admin and user login pages
  - Multilingual support (English/Arabic)

### Pages
- `main.html` - Main landing page (EN)
- `main-ar.html` - Main landing page (AR)
- `reservation.html` / `reservation-ar.html` - Reservation forms
- `user-dashboard.html` / `user-dashboard-ar.html` - User dashboards
- `admin.html`, `admin-login.html` - Admin panel and login
- `welcome.html` / `welcome-ar.html` - Welcome/landing
- `signin.html`, `signup.html` / `signin-ar.html`, `signup-ar.html` - Auth pages

### Assets & Styling
- **Images:** Product, gallery, logo, and banner images in `Assets/`
- **CSS:** Modular stylesheets for each page and global styles in `main.css`
- **JS:** Modular scripts for each page, main logic in `main.js`

### Multilingual Support
- All main pages are available in both English (`HTML/`) and Arabic (`HTML-AR/`)
- RTL support and Arabic fonts/styles for Arabic pages

---

## Setup & Installation

### Prerequisites
- Node.js (v16+ recommended)
- MongoDB (local or cloud instance)

### Backend Setup
1. Navigate to the `Backend/` directory:
   ```sh
   cd Backend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the backend server:
   ```sh
   npm run dev
   # or
   npm start
   ```
   The server runs on `http://localhost:3000` by default.

### Frontend Setup
- Open any HTML file in the `Frontend/HTML/` or `Frontend/HTML-AR/` directory in your browser.
- For local development, you can use a simple HTTP server (e.g., VSCode Live Server, Python's `http.server`, etc.)

---

## Usage
- **Contact Form:** Sends messages to the backend (`/messages` endpoint)
- **Reservation:** Users can book visits, which are stored in the backend (`/reservations`)
- **Authentication:** Users can sign up, log in, and access their dashboard
- **Admin:** Admins can manage users, reservations, and messages via the admin panel
- **Multilingual:** Switch between English and Arabic from the navigation bar

---

## License
This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.
