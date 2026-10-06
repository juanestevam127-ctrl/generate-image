const xml = `
<?xml version="1.0"?>
<veiculos><veiculo><id>1070280</id><loja>Motos Prime</loja><tipo>moto</tipo><marca>BMW</marca><data_cadastro>2026-08-11 15:18:58</data_cadastro><data_update>2026-08-24 17:27:41</data_update><titulo>F 800 R</titulo><modelo>F 800 R</modelo><codigo_fipe>803039-1</codigo_fipe><portas>0</portas><cor>Azul</cor><combustivel>Gasolina</combustivel><ano_fab>2014</ano_fab><ano_mod>2015</ano_mod><placa>FSI-9G32</placa><cambio/><motor>08859842</motor><zerokm>0</zerokm><km>56655</km><observacao/><tag/><valor>31990</valor><galeria><item>https://arquivos.boomsistemas.com.br/veiculos/2026/1070280/gb-01f320f.jpeg</item><item>https://arquivos.boomsistemas.com.br/veiculos/2026/1070280/gb-06fda35.jpeg</item></galeria></veiculo>
<veiculo><id>1059958</id><loja>Motos Prime</loja><tipo>moto</tipo><marca>HONDA</marca><data_cadastro>2026-07-30 14:06:38</data_cadastro><data_update>2026-08-10 11:15:34</data_update><titulo>C 100 BIZ-ES</titulo><modelo>C 100 BIZ-ES</modelo><codigo_fipe>811002-6</codigo_fipe><portas>0</portas><cor>Vermelha</cor><combustivel>Gasolina</combustivel><ano_fab>2013</ano_fab><ano_mod>2014</ano_mod><placa>FRL-4D40</placa><cambio/><motor>HC14E2E009951</motor><zerokm>0</zerokm><km>0</km><observacao/><tag/><valor>11490</valor><galeria><item>https://arquivos.boomsistemas.com.br/veiculos/semfoto.png</item></galeria></veiculo></veiculos>`;

const veiculosRegex = /<veiculo>(.*?)<\/veiculo>/gs;
let match;
const vehicles = [];

const extractTag = (xml, tag) => {
    const regex = new RegExp(`(?:<${tag}>)(.*?)(?:<\\/${tag}>)`, 's');
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
};

while ((match = veiculosRegex.exec(xml)) !== null) {
    const vXml = match[1];

    const galeriaMatch = vXml.match(/<galeria>(.*?)<\/galeria>/s);
    const pictures = [];
    if (galeriaMatch) {
        const itemRegex = /<item>(.*?)<\/item>/g;
        let itemMatch;
        let isFirst = true;
        while ((itemMatch = itemRegex.exec(galeriaMatch[1])) !== null) {
            const link = itemMatch[1].trim();
            if (link && !link.endsWith("semfoto.png")) {
                pictures.push({
                    Link: link,
                    Principal: isFirst ? "true" : "false"
                });
                isFirst = false;
            }
        }
    }

    vehicles.push({
        vehicleExternalKey: extractTag(vXml, 'id'),
        markName: extractTag(vXml, 'marca') || "",
        modelName: extractTag(vXml, 'modelo') || "",
        versionName: extractTag(vXml, 'titulo') || "",
        year: extractTag(vXml, 'ano_mod') || extractTag(vXml, 'ano_fab') || "",
        km: parseInt(extractTag(vXml, 'km') || "0"),
        saleValue: parseFloat(extractTag(vXml, 'valor') || "0"),
        color: extractTag(vXml, 'cor') || "",
        transmissionName: extractTag(vXml, 'cambio') || "",
        fuelName: extractTag(vXml, 'combustivel') || "",
        plate: extractTag(vXml, 'placa') || "",
        subCategoryName: extractTag(vXml, 'tipo') || "",
        description: extractTag(vXml, 'observacao') || "",
        itemJs: "[]",
        pictureJs: JSON.stringify(pictures),
        finalPlate: extractTag(vXml, 'placa') ? extractTag(vXml, 'placa').slice(-1) : ""
    });
}

console.log(JSON.stringify(vehicles, null, 2));
