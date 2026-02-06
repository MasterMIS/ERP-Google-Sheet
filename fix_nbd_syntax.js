
const fs = require('fs');
const path = 'c:\\Users\\maste\\App - Copy\\nextapg\\app\\nbd\\page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix opening
content = content.replace(
    /\{paginatedNBDs\.map\(\(nbd\) => \(\s+const status = getEffectiveStatus\(nbd\);/g,
    '{paginatedNBDs.map((nbd) => {\n                                                        const status = getEffectiveStatus(nbd);'
);

// Fix return return
content = content.replace(/return \(\s+return \(/g, 'return (');

// Fix closing
// Original end of block was ))}. After my edit it might be ))}. 
// I need to find the specific one.
content = content.replace(/\)\)\}\s+<\/tbody>/g, '})}\n                                                </tbody>');

fs.writeFileSync(path, content);
console.log('Fixed syntax error in nbd/page.tsx');
