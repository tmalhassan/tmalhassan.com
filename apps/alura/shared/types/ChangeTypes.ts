export type ChangeOp = 'add' | 'remove' | 'update' | 'replace';
export type ChangeVal = string | number | boolean | object;

interface AddOrRemoveChange {
    path: string;
    op: 'add' | 'remove';
    val: [ChangeVal];
}

interface UpdateOrReplaceChange {
    path: string;
    op: 'update' | 'replace';
    val: [ChangeVal, ChangeVal];
}

export type Change = AddOrRemoveChange | UpdateOrReplaceChange;