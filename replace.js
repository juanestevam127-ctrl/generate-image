const fs = require('fs');
let c = fs.readFileSync('src/app/(dashboard)/dashboard/page.tsx', 'utf-8');
c = c.replace('className={`w-full md:w-1/3 ${viewMode === "importacao" ? "hidden" : ""}`}', 'className="w-full md:w-1/3"');
fs.writeFileSync('src/app/(dashboard)/dashboard/page.tsx', c);
