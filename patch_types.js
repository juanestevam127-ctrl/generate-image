const fs = require('fs');

let c = fs.readFileSync('src/app/actions/estoque.ts', 'utf-8');

c = c.replace(
    'const extractTag = (xml, tag) => {',
    'const extractTag = (xml: string, tag: string) => {'
);

fs.writeFileSync('src/app/actions/estoque.ts', c, 'utf-8');
console.log("Fixed typescript types for extractTag");
