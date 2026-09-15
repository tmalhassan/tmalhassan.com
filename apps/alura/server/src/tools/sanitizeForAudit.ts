import type { Change, ChangeOp } from '../../../shared/types/ChangeTypes.js';
import type { ColorKey } from '../../../shared/types/ProductTypes.js';

export default function sanitizeChangesForAudit(changes: Change[]) {
    const sanitized = [];
    const imageSummary: Record<ColorKey, Record<ChangeOp, number>> = {};

    for (const change of changes) {
        const { path, op, val } = change;

        // Detect image operations like: vars.BLK.var-imgs.5
        const imagePathMatch = path.match(/^vars\.([A-Z]+)\.var-imgs/);
        if (imagePathMatch) {
            const color = imagePathMatch[1];

            if (!imageSummary[color]) {
                imageSummary[color] = { add: 0, remove: 0, update: 0, replace: 0 };
            }
            if (['add', 'remove', 'update'].includes(op)) {
                imageSummary[color][op] += 1;
            }
            continue; // Skip this specific change to sanitized list (handled in summary)
        }

        // Skip object-heavy vals (unless they're small scalars)
        const isComplexObject = Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && val[0] !== null;

        if (isComplexObject) {
            continue;
        }

        // Keep simple changes as-is
        sanitized.push({ path, op, val });
    }

  // Add summarized image change (if any)
    if (Object.keys(imageSummary).length > 0) {
        sanitized.push({
            path: 'vars',
            op: 'image-summary',
            val: imageSummary,
        });
    }

    return sanitized;
}