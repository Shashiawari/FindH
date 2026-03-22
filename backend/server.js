require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const app = require('./app');
const supabase = require('./utils/supabaseClient');
const { setSocketServer } = require('./utils/socketServer');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const allowedOrigins = [
    'http://localhost:3000',
    'https://findhfrontend.vercel.app',
    'https://findh-frontend.vercel.app',
];

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            const isAllowed = allowedOrigins.some(o => origin.startsWith(o)) ||
                origin.endsWith('.vercel.app');
            if (isAllowed) return callback(null, true);
            return callback(new Error(`Socket CORS: origin ${origin} not allowed`));
        },
        credentials: true,
    }
});

io.use((socket, next) => {
    try {
        const rawToken = socket.handshake.auth?.token || socket.handshake.query?.token || '';
        const token = rawToken.startsWith('Bearer ') ? rawToken.split(' ')[1] : rawToken;

        if (!token) {
            return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
        if (decoded.role !== 'user' && decoded.role !== 'agent') {
            return next(new Error('Unauthorized socket role'));
        }

        socket.data.userId = decoded.id;
        socket.data.role = decoded.role;
        return next();
    } catch (err) {
        return next(new Error('Invalid socket token'));
    }
});

io.on('connection', async (socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);

    try {
        const { data: agent } = await supabase
            .from('agents')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

        if (agent?.id) {
            socket.join(`agent:${agent.id}`);
            socket.data.agentId = agent.id;
        }
    } catch (err) {
        console.error('Socket agent room join failed:', err.message);
    }

    socket.emit('socket:connected', {
        userId,
        agentId: socket.data.agentId || null
    });
});

setSocketServer(io);

server.listen(PORT, () => {
    console.log(`✅ FindH Server + Socket running on port ${PORT}`);
});



