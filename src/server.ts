import { buildApp } from './app.js';
import { config } from './config.js';

const app = buildApp();

app
  .listen({ port: config.PORT, host: '0.0.0.0' })
  .then((address) => {
    app.log.info(`pp-wa-bot listening on ${address}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
