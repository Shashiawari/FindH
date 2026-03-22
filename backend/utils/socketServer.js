let ioInstance = null;

const setSocketServer = (io) => {
    ioInstance = io;
};

const getSocketServer = () => ioInstance;

const emitToUser = (userId, eventName, payload) => {
    if (!ioInstance || !userId) return;
    ioInstance.to(`user:${userId}`).emit(eventName, payload);
};

const emitToAgent = (agentId, eventName, payload) => {
    if (!ioInstance || !agentId) return;
    ioInstance.to(`agent:${agentId}`).emit(eventName, payload);
};

module.exports = {
    setSocketServer,
    getSocketServer,
    emitToUser,
    emitToAgent
};
