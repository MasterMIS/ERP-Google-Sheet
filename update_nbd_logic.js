
const fs = require('fs');
const path = 'c:\\Users\\maste\\App - Copy\\nextapg\\app\\nbd\\page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update FollowUpData interface
content = content.replace(
    /interface FollowUpData \{[\s\S]*?\}/,
    `interface FollowUpData {
    nbd_id: number;
    status: string;
    remark: string;
    created_at?: string;
    next_follow_up_date?: string;
    type?: string;
    follow_up_date?: string;
    order_won_count?: number;
}`
);

// 2. Update highlighting logic
content = content.replace(
    /const status = getEffectiveStatus\(nbd\);\s+const isOrderWon = status === 'Order Won';/g,
    `const followUp = followUpDataMap.get(nbd.id);\n                                                        const status = getEffectiveStatus(nbd);\n                                                        const isOrderWon = status === 'Order Won' || (followUp?.order_won_count || 0) > 0;`
);

// 3. Update button visibility logic
content = content.replace(
    /\{getEffectiveStatus\(nbd\) === 'Order Won' && \(/g,
    "{(getEffectiveStatus(nbd) === 'Order Won' || (followUpDataMap.get(nbd.id)?.order_won_count || 0) > 0) && ("
);

fs.writeFileSync(path, content);
console.log('Updated nbd/page.tsx with order_won_count logic');
