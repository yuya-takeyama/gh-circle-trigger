const app = require('./build/index').default;

const port = parseInt(
  typeof process.env.PORT === 'string' ? process.env.PORT : '3000',
  10,
);

app.listen(port);
console.log(`Listening on ${port}...`);
