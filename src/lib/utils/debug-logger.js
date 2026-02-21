const LOG_LEVELS = {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG',
};

const styles = {
    INFO: 'color: #3b82f6; font-weight: bold;',
    WARN: 'color: #f59e0b; font-weight: bold;',
    ERROR: 'color: #ef4444; font-weight: bold;',
    DEBUG: 'color: #10b981; font-weight: bold;',
};

const MAX_LOGS = 1000;
const logBuffer = [];

class DebugLogger {
    constructor(namespace = 'App') {
        this.namespace = namespace;
    }

    log(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${this.namespace}] [${level}]`;

        const logEntry = {
            timestamp,
            namespace: this.namespace,
            level,
            message,
            data
        };

        // Add to buffer
        logBuffer.push(logEntry);
        if (logBuffer.length > MAX_LOGS) {
            logBuffer.shift();
        }

        if (data) {
            console.groupCollapsed(`%c${prefix} ${message}`, styles[level]);
            console.log('Details:', data);
            console.trace('Stack Trace');
            console.groupEnd();
        } else {
            console.log(`%c${prefix} ${message}`, styles[level]);
        }
    }

    info(message, data) {
        this.log(LOG_LEVELS.INFO, message, data);
    }

    warn(message, data) {
        this.log(LOG_LEVELS.WARN, message, data);
    }

    error(message, error) {
        this.log(LOG_LEVELS.ERROR, message, error);
    }

    debug(message, data) {
        if (import.meta.env.DEV) {
            this.log(LOG_LEVELS.DEBUG, message, data);
        }
    }

    static getLogs() {
        return [...logBuffer];
    }

    static clearLogs() {
        logBuffer.length = 0;
    }
}

export const logRoomEvent = (type, details) => {
    const { roomId, userId, estadoAnterior, estadoIntentado } = details;
    const timestamp = new Date().toISOString();

    // Choose color based on type
    const colors = {
        SUCCESS: '#10b981', // green
        CONFLICT: '#f59e0b', // amber
        ERROR: '#ef4444'     // red
    };

    const logStyle = `color: ${colors[type] || '#3b82f6'}; font-weight: bold; font-size: 1.1em;`;

    console.groupCollapsed(`%c[ROOM_EVENT] [${type}] Room: ${roomId}`, logStyle);
    console.log(`%cTimestamp: %c${timestamp}`, 'font-weight: bold;', 'color: #666;');
    console.log(`%cUser ID: %c${userId}`, 'font-weight: bold;', 'color: #3b82f6;');
    console.log(`%cTransition: %c${estadoAnterior} %c-> %c${estadoIntentado}`,
        'font-weight: bold;', 'color: #f59e0b;', 'color: #666;', 'color: #10b981;');

    console.table([{
        roomId,
        userId,
        estadoAnterior,
        estadoIntentado,
        type,
        timestamp
    }]);
    console.groupEnd();
};

export const logger = new DebugLogger('RealtimeAuth');
export const roomLogger = new DebugLogger('RoomService');
export const authLogger = new DebugLogger('AuthService');
export const getLogs = DebugLogger.getLogs;
export const clearLogs = DebugLogger.clearLogs;
