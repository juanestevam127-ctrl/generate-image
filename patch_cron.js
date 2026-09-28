const fs = require('fs');
let code = fs.readFileSync('src/app/api/cron/process-posts/route.ts', 'utf8');

const target1 = `        // 2. Group by veiculo_gerado and nome_empresa
        const groups: Record<string, any[]> = {};
        pendingPosts.forEach(post => {
            const key = \`\${post.nome_empresa}-\${post.veiculo_gerado}-\${post.formato}\`;`;

const replacement1 = `        // 2. Group by identificador_veiculo OR veiculo_gerado and nome_empresa
        const groups: Record<string, any[]> = {};
        pendingPosts.forEach(post => {
            const key = post.identificador_veiculo ? post.identificador_veiculo : \`\${post.nome_empresa}-\${post.veiculo_gerado}-\${post.formato}\`;`;

code = code.replace(target1, replacement1);

const target2 = `                is_carousel: !isReels && posts.length > 1,
                veiculo_gerado: firstPost.veiculo_gerado,`;

const replacement2 = `                is_carousel: !isReels && posts.length > 1,
                veiculo_gerado: firstPost.veiculo_gerado,
                identificador_veiculo: firstPost.identificador_veiculo || null,`;

code = code.replace(target2, replacement2);

fs.writeFileSync('src/app/api/cron/process-posts/route.ts', code);
console.log('cron route patched!');
