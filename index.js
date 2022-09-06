const pino = require('pino');
const pinoElastic = require('pino-elasticsearch')

// TODO: Move to package syslog-levels
// https://datatracker.ietf.org/doc/html/rfc5424
const customLevels = {
    debug: 100,
    info: 200,
    notice: 250,
    warning: 300,
    error: 400,
    critical: 500,
    alert: 550,
    emergency: 600,
};

const level = (label, number) => ({
    level: number,
    level_name: label.toUpperCase(),
});

const index = (obj) => {
    const {
        err,
        code,
        service,
        // erro_string,
        // action,
        user_id,
        userable_type,
        userable_id,
        phone,
        staff,
        duration,
        query,
        ...context
    } = obj;

    const formatted = {
        exception: err?.stack,
        code,
        service,
        // erro_string,
        // action,
        user_id,
        userable_type,
        userable_id,
        phone,
        staff,
        duration,
        query,
        context: logger[pino.symbols.stringifySafeSym](context),
    };

    return formatted;
};

const hooks = {
    logMethod(inputArgs, method, level) {
        if (inputArgs.length >= 2) {
            const arg1 = inputArgs.shift();
            const arg2 = inputArgs.shift();
            return method.apply(this, [arg2, arg1, ...inputArgs]);
        }

        return method.apply(this, inputArgs);
    }
};

const timestamp = () => `,"@timestamp":"${new Date(Date.now()).toISOString()}"`;

const streamToElastic = pinoElastic({
    index: 'filebeat-7.13.2-2022.09.05-000001', // need to be changed
    consistency: 'one', // Work without this field
    node: 'http://elk:9200',
    'es-version': 7,
    'flush-bytes': 1,
    'flush-interval': 1
  })

module.exports.createLogger = (base) => pino({
    base,
    messageKey: 'message',
    formatters: { level, log: index },
    customLevels,
    useOnlyCustomLevels: true,
    level: 'debug',
    hooks,
    timestamp,
}, streamToElastic);

// ###### TEST ######

const base = {
    application: 'fatal-stories-api',
    environment: 'local',
    git_commit: '0000',
};

const logger = module.exports.createLogger(base);

const child = logger.child({});

child.debug('hello message');
child.error('hello message', {
    code: 'error_hello',
    err: new Error('Hello error'),
});

// logger.child - validar/formatar bindings?
// Não gerar mais logs do express (apenas pino)
// pino-elasticsearch - caso elastic esteja indisponível os logs são perdidos? - usar pino.destination ou transport + filebeat
// pretty-print em modo dev - difícil testar formatação json para ELK, não suporta custom levels




// upgrade Node.js (16 ou 18)
// Mover para pacote(s)
// filebeat + logrotate OU pino-elasticsearch? se pino-elasticsearch precisa criar index(line 73)
// adicionar tests unitários ao logger


// Documentar:
// - err vs exception
// - porque message primeiro? Pois é obrigatório para exibição no ELK
// - por que pino?
//   - performance
