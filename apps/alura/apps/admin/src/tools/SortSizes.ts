import type { sizeKey } from "../types/ProductTypes";

export default function SortSizes(sizesArray: sizeKey[]) {
    const modifSizes: sizeKey[] = [];
    const theOrder: sizeKey[] = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];

    for (let i = 0; i < theOrder.length; i++) {
        if (sizesArray.indexOf(theOrder[i]) > -1) {
            modifSizes.push(theOrder[i]);
        }
    }
    return modifSizes;
}