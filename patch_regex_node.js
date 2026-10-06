const fs = require('fs');

let c = fs.readFileSync('src/app/actions/estoque.ts', 'utf-8');

c = c.replace(/const regex = new RegExp\([^)]+\);\s*const match = xml\.match\(regex\);/, `const regex = new RegExp(\`<\${tag}>([\\\\s\\\\S]*?)<\\\\/\${tag}>\`);\n            const match = xml.match(regex);`);

c = c.replace(/<galeria>\(\.\*\?\)<\\\\\/galeria>\/s/, `<galeria>([\\s\\S]*?)<\\/galeria>/`);
c = c.replace(/<galeria>\(\.\*\?\)<\\\/galeria>\/s/, `<galeria>([\\s\\S]*?)<\\/galeria>/`);
c = c.replace(/vXml\.match\(\/<galeria>\(\.\*\?\)<\\\/galeria>\/s\)/, `vXml.match(/<galeria>([\\s\\S]*?)<\\/galeria>/)`);

fs.writeFileSync('src/app/actions/estoque.ts', c, 'utf-8');
console.log("Fixed regex dotAll");
