const fs = require('fs');
const lines = fs.readFileSync('src/components/features/PostScheduler.tsx', 'utf8').split('\n');
for (let i = 649; i < 682; i++) {
    console.log(`${i+1}: [${lines[i].replace(/ /g, '.')}]`);
}
