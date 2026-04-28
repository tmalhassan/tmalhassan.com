export interface ProductData {
    id: number | undefined;
    name_en: string | undefined;
    original_price: number | undefined;
    discount_price: number | undefined | null;
    attributes: {
        designer: string | undefined | null;
        collection: string | undefined | null;
        season: string | undefined | null;
        category: string | undefined | null;
        style: string | undefined | null;
        fabric: string | undefined | null;
        stretch_type: string | undefined | null;
        pattern: string | undefined | null;
        fit_type: string | undefined | null;
        sleeve_length: string | undefined | null;
        sleeve_type: string | undefined | null;
        length: string | undefined | null;
        hem_shape: string | undefined | null;
        neckline: string | undefined | null;
        neck_height: string | undefined | null;
        waist_line: string | undefined | null;
        extra: string | null | undefined;
    };
    vars: Record<ColorKey, ColorVariant>;
    sizes: Record<sizeKey, SizeMeasurements>;
    ['search-tags']: string[];
    last_modified: string | undefined;
}

export type FetchedProductData = Omit<ProductData, 'vars'> & {
    vars: Record<ColorKey, FetchedDataColorVariant>;
};

export type ColorKey = string;

export interface newColorType {
    sc: ColorKey | undefined;
    name: string | undefined;
}

export interface ColorVariant {
    'color-img': ImageObject;
    'color-name': string | undefined;
    model: {
        'model-id': number | undefined;
        'model-f-name': string | undefined;
        'model-l-name': string | undefined;
        'model-tel-number': string | undefined;
        'model-bust': number | undefined;
        'model-hips': number | undefined;
        'model-waist': number | undefined;
        'model-height': number | undefined;
        'model-ig-acc': string | undefined;
        'model-pfp': string | undefined;
    };
    'var-imgs': ImageObject[];
    'varSizesQuantity': Record<sizeKey, VarSizeStock>;
    'new_color': newColorType
}

export type FetchedDataColorVariant = Omit<ColorVariant, 'var-imgs'> & {
    'var-imgs': number;
};

export interface ImageObject {
    link: string | null | undefined;
    blob: File | null | undefined;
}

export interface VarSizeStock{
    is_deleted: 0 | 1;
    stock_batches: SizeStockBatch[];
}

export interface SizeStockBatch {
    'batch_id': number | string | undefined;
    'current_available': number;
    'total_sales': number;
    'is_active': 0 | 1;
}

export type sizeKey = string;

export interface SizeMeasurements {
    'p-shoulders': string | null;
    'p-length': string | null;
    'p-bust': string | null;
    'p-waist': string | null;
    'p-hips': string | null;
    'ext-p-sleeve-length': string | null;
    'ext-p-belt-length': string | null;
    'ext-p-straps-length': string | null;
    'ext-p-cuff': string | null;
    'ext-p-bicep-length': string | null;
    'b-shoulders': string | null;
    'b-bust': string | null;
    'b-waist': string | null;
    'b-hips': string | null;
    'b-height': string | null;
}

// --------------------------------------------------------------  For products view grid  ---------------------------------------------------------------------

export interface ProductPreview {
    id: number;
    name_en: string;
    original_price: number;
    discount_price: number;
    sizes: string[];
    vars: Record<ColorKey, PreviewColorVariant>
    is_deleted: 0 | 1;
}

interface PreviewColorVariant {
    'color-img': string;
    'color-name': string;
    'var-imgs': string;
}

// --------------------------------------------------------------------  For immer   ---------------------------------------------------------------------------