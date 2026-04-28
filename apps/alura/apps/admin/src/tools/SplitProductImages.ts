import type { ColorKey, ColorVariant, FetchedProductData, ImageObject, ProductData } from "shared/types/ProductTypes";

export default function SplitProductImages(productData: FetchedProductData): ProductData {
    const { id, name_en, original_price, discount_price, attributes, sizes, ['search-tags']: searchTags, last_modified } = productData;

    const fixedDP = discount_price === null ? undefined : discount_price;

    const vars: Record<ColorKey, ColorVariant> = Object.entries(productData.vars).reduce((acc, [varCC, variant]) => {
        const productID = productData.id;

        const varImgs: ImageObject[] = Array.from({ length: variant['var-imgs'] }).map((_, index) => ({
            link: `products/${productID}/${productID}${varCC}/${index}-thumb.webp`,
            blob: null
        }));

        const colorImg: ImageObject = {
            link: `products/${productID}/${productID}${varCC}.webp`,
            blob: null
        };

        acc[varCC] = {
            ...variant,
            ['var-imgs']: varImgs,
            ['color-img']: colorImg,
            new_color: { sc: undefined, name: undefined }
        };

        return acc;
    }, {} as Record<ColorKey, ColorVariant>);

    return { id, name_en, original_price, discount_price: fixedDP, attributes, vars, sizes, ['search-tags']: searchTags, last_modified }
}