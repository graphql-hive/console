import { config } from 'dotenv';

config({
  debug: true,
  encoding: 'utf8',
});

await import('./index.js');

// Not having this caused hell
process.stdout.on('error', function (err) {
  if (err.code == 'EPIPE') {
    process.exit(0);
  }
});
