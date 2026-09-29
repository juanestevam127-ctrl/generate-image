const fs = require('fs');
let content = fs.readFileSync('src/components/features/PostScheduler.tsx', 'utf8');

// Fix import (CRLF)
content = content.replace(
    'fetchAllScheduledPostsAction \r\n} from "@/app/actions/scheduler";',
    'fetchAllScheduledPostsAction,\r\n    getOrCreateIdentificadorAction\r\n} from "@/app/actions/scheduler";'
);

// Replace identifier block - note mixed CRLF/LF
const oldBlock = `            const existingIdentificador = currentPost.identificador_veiculo\r\n                || sortedImagesList.find(img => img.identificador_veiculo)?.identificador_veiculo;\r\n            const identificadorVeiculo = existingIdentificador || Math.random().toString(36).substring(2, 10).toUpperCase();`;

const newBlock = `            const imageIds = sortedImagesList.map(img => img.id).filter(Boolean) as number[];\r\n            const identificadorVeiculo = await getOrCreateIdentificadorAction(imageIds);`;

content = content.replace(oldBlock, newBlock);

fs.writeFileSync('src/components/features/PostScheduler.tsx', content);
console.log('import ok:', content.includes('getOrCreateIdentificadorAction'));
console.log('usage ok:', content.includes('getOrCreateIdentificadorAction(imageIds)'));
