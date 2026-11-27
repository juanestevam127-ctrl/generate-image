import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const CLICKUP_TOKEN = process.env.CLICKUP_TOKEN || "pk_112068213_H24CB6Q9OBLJMNEMECLOHXNS7Z27HLJ6";
const NOCO_URL = process.env.NEXT_PUBLIC_NOCO_URL || "https://evolution-nocodb.5rqumh.easypanel.host";
const NOCO_TOKEN = process.env.NOCO_TOKEN || "C2l41lZPrFvg6UrzEpB6bwe0tD5bLMFWeuWjAlZD";
const NOCO_TABLE_ID = "mleia5r89rshard";

const R2_ENDPOINT = process.env.R2_ENDPOINT || "https://504606956cf9454e5c1a0ee6a159a338.r2.cloudflarestorage.com";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "6403d276742ca081b4908554c548089b";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "e4c20157a3943c037aca4df3b10c63aa5198af0ca1aca4ac9ede5368db847dba";
const R2_BUCKET = "autodesign-bucket";
const CDN_DOMAIN = "https://cdn.artesdesignonline.com.br";

const s3 = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY
    }
});

const CF_SEGUNDA_ID = "45e7335c-098f-4f08-ae8f-9e42ea21c257";
const CF_SABADO_ID = "06c31ac7-0509-4e73-80f1-3213e524eff5";

function normalizeName(name) {
    return (name || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\(novo\)|\(carro\)|\(moto\)|\(motos\)/gi, "")
        .replace(/[^a-z0-9]/g, "")
        .trim();
}

async function uploadToR2(url, prefixName, suffix) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Falha ao baixar imagem do ClickUp: ${res.statusText}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = res.headers.get("content-type") || "image/png";
    const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";

    const rand = Math.random().toString(36).substring(2, 7);
    const key = `temp-files/${Date.now()}-${rand}.${ext}`;

    const command = new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType
    });

    await s3.send(command);
    return `${CDN_DOMAIN}/${key}`;
}

async function main() {
    console.log("=== INICIANDO MIGRAÇÃO DE STORIES SEGUNDA E SÁBADO PARA R2 & NOCODB ===");

    // 1. Buscar todos os clientes do NocoDB
    console.log("\n1. Buscando clientes no NocoDB...");
    let nocoClients = [];
    let offset = 0;
    while (true) {
        const url = `${NOCO_URL}/api/v2/tables/${NOCO_TABLE_ID}/records?limit=100&offset=${offset}`;
        const res = await fetch(url, { headers: { "xc-token": NOCO_TOKEN } });
        const data = await res.json();
        const list = data.list || [];
        nocoClients.push(...list);
        if (data.pageInfo?.isLastPage || list.length < 100) break;
        offset += 100;
    }
    console.log(`Encontrados ${nocoClients.length} clientes no NocoDB.`);

    // 2. Buscar todas as tarefas da View Story - Auto no ClickUp
    console.log("\n2. Buscando tarefas na View 'Story - Auto' do ClickUp...");
    let clickupTasks = [];
    let page = 0;
    while (true) {
        const r = await fetch(`https://api.clickup.com/api/v2/view/8cdt6zq-7973/task?page=${page}`, {
            headers: { Authorization: CLICKUP_TOKEN }
        });
        const d = await r.json();
        if (!d.tasks || d.tasks.length === 0) break;
        clickupTasks.push(...d.tasks);
        if (d.last_page) break;
        page++;
    }
    console.log(`Encontradas ${clickupTasks.length} tarefas no ClickUp.`);

    // 3. Processar cada tarefa com imagem
    let updatedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    for (const task of clickupTasks) {
        const cfSeg = task.custom_fields?.find(cf => cf.id === CF_SEGUNDA_ID);
        const cfSab = task.custom_fields?.find(cf => cf.id === CF_SABADO_ID);

        const segAttachment = cfSeg?.value && Array.isArray(cfSeg.value) && cfSeg.value.length > 0 ? cfSeg.value[0] : null;
        const sabAttachment = cfSab?.value && Array.isArray(cfSab.value) && cfSab.value.length > 0 ? cfSab.value[0] : null;

        if (!segAttachment && !sabAttachment) {
            continue; // Sem imagens cadastradas para esse cliente
        }

        // Tentar encontrar o cliente no NocoDB:
        // Primeiro por ID ClickUp (id_clickup ou clickup_tarefa_id)
        let nocoClient = nocoClients.find(c => 
            (c.id_clickup && c.id_clickup.toString().trim() === task.id.toString().trim()) ||
            (c.clickup_tarefa_id && c.clickup_tarefa_id.toString().trim() === task.id.toString().trim())
        );

        // Se não encontrar por ID, tentar por correspondência normalizada de nome
        if (!nocoClient) {
            const taskNorm = normalizeName(task.name);
            nocoClient = nocoClients.find(c => {
                const cNorm = normalizeName(c.name || "");
                return cNorm === taskNorm || (cNorm.length > 3 && (cNorm.includes(taskNorm) || taskNorm.includes(cNorm)));
            });
        }

        if (!nocoClient) {
            console.warn(`[NÃO ENCONTRADO NO NOCODB] Tarefa: "${task.name}" (ID: ${task.id})`);
            notFoundCount++;
            continue;
        }

        console.log(`\nProcessando: "${task.name}" ➔ Cliente NocoDB: "${nocoClient.name}" (ID Noco: ${nocoClient.id})`);

        const updates = {};

        // Segunda
        if (segAttachment) {
            const imgUrl = segAttachment.url || segAttachment.url_w_query;
            if (nocoClient.guide_stories_segunda && nocoClient.guide_stories_segunda.includes("artesdesignonline.com.br")) {
                console.log(`  - Stories Segunda já configurado: ${nocoClient.guide_stories_segunda}`);
            } else {
                try {
                    console.log(`  - Enviando Stories Segunda para R2... (${segAttachment.title})`);
                    const r2Url = await uploadToR2(imgUrl, nocoClient.name, "segunda");
                    updates.guide_stories_segunda = r2Url;
                    console.log(`    ✓ Upload concluído: ${r2Url}`);
                } catch (e) {
                    console.error(`    ✗ Erro no upload Segunda: ${e.message}`);
                }
            }
        }

        // Sábado
        if (sabAttachment) {
            const imgUrl = sabAttachment.url || sabAttachment.url_w_query;
            if (nocoClient.guide_stories_sabado && nocoClient.guide_stories_sabado.includes("artesdesignonline.com.br")) {
                console.log(`  - Stories Sábado já configurado: ${nocoClient.guide_stories_sabado}`);
            } else {
                try {
                    console.log(`  - Enviando Stories Sábado para R2... (${sabAttachment.title})`);
                    const r2Url = await uploadToR2(imgUrl, nocoClient.name, "sabado");
                    updates.guide_stories_sabado = r2Url;
                    console.log(`    ✓ Upload concluído: ${r2Url}`);
                } catch (e) {
                    console.error(`    ✗ Erro no upload Sábado: ${e.message}`);
                }
            }
        }

        // Atualizar no NocoDB se houver novidades
        if (Object.keys(updates).length > 0) {
            const updateUrl = `${NOCO_URL}/api/v2/tables/${NOCO_TABLE_ID}/records`;
            const payload = {
                id: nocoClient.id,
                ...updates
            };
            const updateRes = await fetch(updateUrl, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "xc-token": NOCO_TOKEN
                },
                body: JSON.stringify(payload)
            });

            if (!updateRes.ok) {
                console.error(`  ✗ Erro ao salvar no NocoDB: ${await updateRes.text()}`);
            } else {
                console.log(`  ✓ NocoDB atualizado com sucesso!`);
                updatedCount++;
                // Atualizar referência local
                if (updates.guide_stories_segunda) nocoClient.guide_stories_segunda = updates.guide_stories_segunda;
                if (updates.guide_stories_sabado) nocoClient.guide_stories_sabado = updates.guide_stories_sabado;
            }
        } else {
            console.log(`  - Nenhuma alteração necessária.`);
            skippedCount++;
        }
    }

    console.log("\n=== MIGRAÇÃO CONCLUÍDA ===");
    console.log(`Atualizados: ${updatedCount}`);
    console.log(`Já estavam preenchidos/ignorados: ${skippedCount}`);
    console.log(`Não encontrados no NocoDB: ${notFoundCount}`);
}

main().catch(console.error);
