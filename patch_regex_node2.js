const fs = require('fs');

let c = fs.readFileSync('src/app/actions/estoque.ts', 'utf-8');

c = c.replace(
    "const regex = new RegExp(`<\${tag}>(.*?)<\\\\/\${tag}>`, 's');",
    "const regex = new RegExp(`<\${tag}>([\\\\s\\\\S]*?)<\\\\/\${tag}>`);"
);

fs.writeFileSync('src/app/actions/estoque.ts', c, 'utf-8');
console.log("Fixed regex dotAll for extractTag");
