const fs = require('fs');

let c = fs.readFileSync('src/components/features/ClientManager.tsx', 'utf-8');

c = c.replace(
`const [bndvCustomerKey,
            boomToken,
            boomCustomerKey, setBndvCustomerKey] = useState("");`,
`const [bndvCustomerKey, setBndvCustomerKey] = useState("");`
);

fs.writeFileSync('src/components/features/ClientManager.tsx', c, 'utf-8');
console.log("Fixed ClientManager.tsx");
