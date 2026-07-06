#!/bin/sh
set -e

APP_MODE="${APP_MODE:-production}"

npm install

if [ ! -f .env ]; then
  cat > .env <<'EOF'
REACT_APP_API_URL=/api
WATCHPACK_POLLING=false
DISABLE_ESLINT_PLUGIN=true
GENERATE_SOURCEMAP=false
EOF
fi

cd server && npm install

if [ ! -f .env ]; then
  cat > .env <<'EOF'
PORT=3011
FRONTEND_URL=http://yourdomain.com
ALLOWED_ORIGINS=http://localhost:3010
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=support@mywebsite.com
EMAIL_PASS="gmai lapp pass word"
EMAIL_FROM=no-reply@mywebsite.com
EMAIL_TO=info@mywebsite.com
SESSION_SECRET=company-session-secret-change-this-in-production
GOOGLE_CLIENT_ID=yourcompanygoogleid.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=yourcompanygoogleclientsecret
GOOGLE_CLOUD_API_KEY=yourcompanycloudapikey
REACT_APP_API_URL=/api
WATCHPACK_POLLING=false
EOF
fi

cd ..

if [ ! -f /app/.setup-disabled ]; then
  cd setup && npm install
  cd api && npm install
  cd ../..
fi

if [ "$APP_MODE" = "development" ]; then
  export DISABLE_ESLINT_PLUGIN=true
  export GENERATE_SOURCEMAP=false
  export TSC_COMPILE_ON_ERROR=true

  if [ -f /app/.setup-disabled ]; then
    exec concurrently 'npm run start' 'npm run server:prod'
  else
    exec concurrently 'npm run start' 'npm run server:prod' 'npm run setup'
  fi
else
  echo "Building frontend for production (lower memory than webpack dev server)..."
  export DISABLE_ESLINT_PLUGIN=true
  export GENERATE_SOURCEMAP=false
  export TSC_COMPILE_ON_ERROR=true
  if [ ! -f build/index.html ]; then
    npm run build
  else
    echo "Using existing production build in build/"
  fi
  exec npm run server:prod
fi
