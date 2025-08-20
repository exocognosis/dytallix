import cors from 'cors';
export function configureCors(app) {
  const allowList = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
  const options = {
    origin(origin, cb) {
      if (!origin) return cb(null, true); // allow server-to-server & curl
      if (allowList.includes(origin)) return cb(null, true);
      return cb(new Error('CORS_NOT_ALLOWED'), false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 600
  };
  app.use(cors(options));
  app.options('*', cors(options));
}