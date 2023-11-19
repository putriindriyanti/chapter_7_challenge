require('dotenv').config();
const express = require('express');
const app = express();
const Sentry = require('@sentry/node')
const morgan = require('morgan');
const { PORT = 3000, SENTRY_DSN, ENV } = process.env;

Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      // enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // enable Express.js middleware tracing
      new Sentry.Integrations.Express({ app }),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0,
    environmen: ENV,
  });
  

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler());

// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

// config websocket
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const authRouter = require('./routes/auth.routes');
const usersRouter = require('./routes/users.routes')


io.on('connection', (client) => {
    console.log('new user connected!');

// subscribe topik 'chat message'
client.on('chat message', msg => {
    io.emit('chat message', msg);
    });
});

app.use((req, res, next) => {
    req.io = io;
    next();
  });

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);

// The error handler must be registered before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler());

// 404
app.use((req, res, next) => {
    res.status(404).json({
        status: false,
        message: 'Not Found!',
        error: null,
        data: null
    });
});

// 500
app.use((err, req, res, next) => {
    res.status(500).json({
        status: false,
        message: 'Internal Server Error',
        error: err.message,
        data: null
    });
});

app.listen(PORT, () => {
    console.log(`server running at http://localhost:${PORT}`);
});