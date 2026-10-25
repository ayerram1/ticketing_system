# Local Setup

## Option 1: Running with Docker (Recommended)

Running with Docker isolates Node.js, Express, and PostgreSQL so teammates do not need to install or configure PostgreSQL manually on their host machine.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### 1. Start the Containers
In the project root directory, run:
```bash
docker compose up --build
```
This builds and starts:
- **PostgreSQL Database** on `localhost:5432`
- **Express Backend** on `localhost:3301`
- **React Frontend** on `localhost:3001`

### 2. Stop Containers
```bash
docker compose down
```
*(Database data is preserved in the `postgres_data` volume across restarts).*

---

## Option 2: Manual Local Setup (Without Docker)

### Installation
- [PostgreSQL](https://www.postgresql.org/download/)
- [Node.js/npm](https://nodejs.org/en/download/)

### Instructions 
Detailed guide [Here](https://drive.google.com/file/d/12-wDsdsj-fSjO4mJPRtPdC0eYjVJ0kkm/view?usp=drive_link) 

### Running Project
Running React (under frontend): `npm start` (port 3001)

Running Node.js (under backend): `node server.js` (port 3301)


# Project directory

```
backend/ 
├── certs/        Public certificates and API metadata
├── config/       Configuration files for database and server
├── controllers/  Handles request processing and business logic
├── middleware/   Custom middleware for authentication and error handling 
├── models/       Database schemas and ORM models 
├── migrations/   Database migrations 
├── routes/       API routes linking endpoints to controllers 
├── scripts/      Additional scripts (e.g., database seeding, utilities) 
    ├── services/ API for sending email notifications 
├── .env          Environment variables for database, server, email notifications 
├── server.js     Entry point for the backend application 
```
```
frontend/ 
├── build/           Compiled and minified production build 
├── public/          Public static assets (e.g., HTML, images, fonts) 
├── src/             Main source code for the frontend 
    ├── assets/      Images, icons, and other static resources 
    ├── components/  Reusable React components 
    ├── pages/       Page-level components (e.g., Dashboard, Login) 
    ├── services/    API service functions for communicating with the backend 
    ├── themes/      Styling and theme files 
    ├── App.js       Root component defining the app structure 
    ├── index.js     Entry point for the React app 
    └── routes.js    Frontend route definitions 
├── .env             Environment variables for the frontend 
├── package.json     Dependencies and scripts for the React app
```


# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.
