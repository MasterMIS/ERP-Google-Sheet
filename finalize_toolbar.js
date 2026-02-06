
const fs = require('fs');
const path = 'c:\\Users\\maste\\App - Copy\\nextapg\\app\\nbd\\page.tsx';
let content = fs.readFileSync(path, 'utf8');

// The toolbar part looks like this:
//                             <div className="flex gap-2 bg-[var(--theme-light)] dark:bg-gray-700 p-1 rounded-xl border border-[var(--theme-primary)]/20">
//                                 {(['list', 'calendar', 'tile', 'dead'] as const).map((mode) => (
//                                     ...
//                                 ))}
//                             </div>

// We want to insert our button just AFTER this div or BEFORE handleExportCSV button.

const buttonCode = `
                            {nbds.some(nbd => (getEffectiveStatus(nbd) === 'Order Won' || (followUpDataMap.get(nbd.id)?.order_won_count || 0) > 0)) && (
                                <motion.button
                                    onClick={handleBulkShiftToCRR}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-3 py-2 bg-green-600 text-white hover:bg-green-700 hover:shadow-lg rounded-xl transition-all flex items-center gap-2 font-bold text-xs"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                    <span className="hidden sm:inline">Shift Won to CRR</span>
                                </motion.button>
                            )}
`;

if (!content.includes('Shift Won to CRR')) {
    // Look for the end of the view mode switcher div
    content = content.replace('      </motion.button>\n                                ))} \n                            </div>', '      </motion.button>\n                                ))}\n                            </div>' + buttonCode);

    // If that didn't work, try a different marker
    if (!content.includes('Shift Won to CRR')) {
        content = content.replace('<motion.button\n                                onClick={handleExportCSV}', buttonCode + '\n                            <motion.button\n                                onClick={handleExportCSV}');
    }
}

fs.writeFileSync(path, content);
console.log('Finished updating toolbar button');
